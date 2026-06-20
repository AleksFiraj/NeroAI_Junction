import createGlobe from "cobe";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

// Tirana location in [phi, theta] for cobe markers.
const TIRANA: [number, number] = [41.3275, 19.8187];

export function GlobeIntro({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let phi = 0;
    let width = 0;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onResize = () => {
      width = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);
    onResize();

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.2,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.12, 0.16, 0.26],
      markerColor: [0.93, 0.27, 0.27],
      glowColor: [0.23, 0.51, 0.96],
      markers: [{ location: TIRANA, size: 0.12 }],
      onRender: (state: Record<string, any>) => {
        state.phi = phi;
        phi += 0.012;
        state.width = width * 2;
        state.height = width * 2;
      },
    } as any);

    const timer = window.setTimeout(onDone, 2600);
    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, [onDone]);

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.4 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <motion.canvas
        ref={canvasRef}
        initial={{ scale: 0.85 }}
        animate={{ scale: 1.05 }}
        transition={{ duration: 2.6, ease: "easeIn" }}
        style={{ width: 420, maxWidth: "70vw", aspectRatio: "1", contain: "layout paint size" }}
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-4 text-[12px] uppercase tracking-[0.2em] text-text-subtle"
      >
        Locating Tirana grid
      </motion.p>
    </motion.div>
  );
}
