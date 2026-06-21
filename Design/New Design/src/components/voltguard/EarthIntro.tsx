import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = { onDone: () => void };

// Tirana: 41.3275°N, 19.8187°E
const TIRANA_LAT = 41.3275;
const TIRANA_LNG = 19.8187;

const EARTH_TEXTURE =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
const BUMP_TEXTURE =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";
const COUNTRIES_GEOJSON =
  "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@v5.1.2/geojson/ne_110m_admin_0_countries.geojson";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Convert (lat, lng) -> 3D position in the earthGroup's local frame so that
// when earthGroup.rotation.y = -(lng + 90°) and rotation.x = lat, the point
// faces the camera at +Z. This matches the three-globe blue-marble texture.
function latLngToVec3(lat: number, lng: number, r: number) {
  const latR = THREE.MathUtils.degToRad(lat);
  const alpha = THREE.MathUtils.degToRad(lng + 90);
  return new THREE.Vector3(
    r * Math.cos(latR) * Math.sin(alpha),
    r * Math.sin(latR),
    r * Math.cos(latR) * Math.cos(alpha),
  );
}


export function EarthIntro({ onDone }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);


  useEffect(() => {
    const mount = mountRef.current!;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // Earth
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const geo = new THREE.SphereGeometry(1.6, 96, 96);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    const mat = new THREE.MeshPhongMaterial({
      color: 0x335577,
      shininess: 12,
    });
    const earth = new THREE.Mesh(geo, mat);
    earthGroup.add(earth);

    loader.load(EARTH_TEXTURE, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
    });
    loader.load(BUMP_TEXTURE, (tex) => {
      mat.bumpMap = tex;
      mat.bumpScale = 0.04;
      mat.needsUpdate = true;
    });

    // Albania outline only (loaded async from GeoJSON)
    const COUNTRY_RADIUS = 1.605;
    const countryMat = new THREE.LineBasicMaterial({
      color: 0xff4d4d,
      transparent: true,
      opacity: 0.9,
    });
    let countryLines: THREE.LineSegments | null = null;
    let cancelled = false;

    fetch(COUNTRIES_GEOJSON)
      .then((r) => r.json())
      .then((gj: any) => {
        if (cancelled) return;
        const positions: number[] = [];
        const pushRing = (ring: number[][]) => {
          for (let i = 0; i < ring.length - 1; i++) {
            const a = latLngToVec3(ring[i][1], ring[i][0], COUNTRY_RADIUS);
            const b = latLngToVec3(ring[i + 1][1], ring[i + 1][0], COUNTRY_RADIUS);
            positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
          }
        };
        for (const feat of gj.features ?? []) {
          const props = feat.properties ?? {};
          const name = props.ADMIN ?? props.NAME ?? props.name ?? "";
          if (String(name).toLowerCase() !== "albania") continue;
          const g = feat.geometry;
          if (!g) continue;
          if (g.type === "Polygon") {
            for (const ring of g.coordinates) pushRing(ring);
          } else if (g.type === "MultiPolygon") {
            for (const poly of g.coordinates) for (const ring of poly) pushRing(ring);
          }
        }
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(positions), 3),
        );
        countryLines = new THREE.LineSegments(lineGeo, countryMat);
        earthGroup.add(countryLines);
      })
      .catch(() => {});

    // Tirana marker (pin + pulsing ring) on the earth surface
    const markerGroup = new THREE.Group();
    const tiranaPos = latLngToVec3(TIRANA_LAT, TIRANA_LNG, 1.61);
    markerGroup.position.copy(tiranaPos);
    // Orient marker so it points outward from sphere
    markerGroup.lookAt(tiranaPos.clone().multiplyScalar(2));
    earthGroup.add(markerGroup);

    const pinMat = new THREE.MeshBasicMaterial({ color: 0xff4d4d });
    const pinDot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 16), pinMat);
    markerGroup.add(pinDot);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff4d4d,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.036, 32), ringMat);
    markerGroup.add(ring);


    // Atmosphere glow (back-facing shell)
    const atmoGeo = new THREE.SphereGeometry(1.78, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main(){
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }`,
      fragmentShader: `
        varying vec3 vNormal;
        void main(){
          float i = pow(0.72 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.4);
          gl_FragColor = vec4(0.45, 0.72, 1.0, 1.0) * i;
        }`,
    });
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmo);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 20;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      starPos[i * 3 + 1] = r * Math.cos(p);
      starPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })
    );
    scene.add(stars);

    // Starting orientation
    earthGroup.rotation.y = -2.2;
    earthGroup.rotation.x = 0;

    // Target orientation that centers Tirana toward camera (+Z).
    // For the three-globe equirectangular texture, the seam (lng=-180) sits at +X,
    // so to bring (lat, lng) under the camera we rotate by -(lng + 90°) on Y
    // and +lat on X.
    const targetY = -THREE.MathUtils.degToRad(TIRANA_LNG + 90);
    const targetX = THREE.MathUtils.degToRad(TIRANA_LAT);

    const SPIN_MS = 1800; // free spin
    const ZOOM_MS = 2200; // travel to Tirana + zoom in
    const FADE_MS = 700;
    const startedAt = performance.now();
    let raf = 0;

    const fromY = earthGroup.rotation.y;
    const fromX = earthGroup.rotation.x;
    const fromZ = camera.position.z;
    const toZ = 2.05;

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    const worldPos = new THREE.Vector3();

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      let labelOpacity = 0;

      if (elapsed < SPIN_MS) {
        // Free spin
        earthGroup.rotation.y = fromY + (elapsed / 1000) * 0.6;
        stars.rotation.y += 0.0004;
      } else if (elapsed < SPIN_MS + ZOOM_MS) {
        const t = easeInOutCubic((elapsed - SPIN_MS) / ZOOM_MS);
        const spunY = fromY + (SPIN_MS / 1000) * 0.6;
        let dy = targetY - spunY;
        dy = ((dy + Math.PI) % (Math.PI * 2)) - Math.PI;
        earthGroup.rotation.y = spunY + dy * t;
        earthGroup.rotation.x = fromX + (targetX - fromX) * t;
        camera.position.z = fromZ + (toZ - fromZ) * t;
        labelOpacity = Math.max(0, (t - 0.45) / 0.55);
      } else {
        labelOpacity = 1;
        if (!doneRef.current) {
          doneRef.current = true;
          if (overlayRef.current) overlayRef.current.style.opacity = "0";
          window.setTimeout(() => onDone(), FADE_MS);
        }
      }

      // Pulse the marker ring
      const pulse = 1 + 0.35 * Math.sin(elapsed / 280);
      ring.scale.setScalar(pulse);
      ringMat.opacity = 0.75 - 0.35 * (pulse - 1);

      // Project Tirana to screen for the HTML label
      if (labelRef.current) {
        markerGroup.getWorldPosition(worldPos);
        const projected = worldPos.clone().project(camera);
        const w = mount.clientWidth;
        const h = mount.clientHeight;
        const sx = (projected.x * 0.5 + 0.5) * w;
        const sy = (-projected.y * 0.5 + 0.5) * h;
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        const facing = worldPos.clone().normalize().dot(camDir.negate());
        const visible = facing > 0.05 && labelOpacity > 0;
        labelRef.current.style.opacity = visible ? String(labelOpacity) : "0";
        labelRef.current.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);


    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      countryMat.dispose();
      if (countryLines) countryLines.geometry.dispose();
      pinMat.dispose();
      ringMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [onDone]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-30 bg-card"
      style={{ transition: "opacity 700ms ease-out" }}
    >
      <div ref={mountRef} className="h-full w-full" />
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ opacity: 0, transition: "opacity 200ms ease-out", willChange: "transform, opacity" }}
      >
        <div className="flex flex-col items-center -translate-y-2">
          <div className="rounded-md border border-white/20 bg-black/70 px-2 py-1 text-[11px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-sm">
            Tirana
          </div>
          <div className="h-3 w-px bg-white/60" />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
        <div className="mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Locating · Tirana, Albania
        </div>
      </div>
    </div>
  );
}
