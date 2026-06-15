/**
 * Embedded photoreal Stratocaster model from Sketchfab
 * (Fender Stratocaster Guitar by Ryan_Nein, CC-BY).
 */
export function SketchfabStratViewer() {
  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-hidden rounded-lg border border-border bg-background shadow-elegant" style={{ aspectRatio: '16 / 10' }}>
        <iframe
          title="Fender Stratocaster Guitar"
          src="https://sketchfab.com/models/15a37147641b4c1b963bb494b234593f/embed?autostart=0&ui_theme=dark"
          frameBorder={0}
          allow="autoplay; fullscreen; xr-spatial-tracking"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Model:{' '}
        <a
          href="https://sketchfab.com/3d-models/fender-stratocaster-guitar-15a37147641b4c1b963bb494b234593f"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          Fender Stratocaster Guitar
        </a>{' '}
        by{' '}
        <a
          href="https://sketchfab.com/Ryan_Nein"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
        >
          Ryan_Nein
        </a>{' '}
        on Sketchfab.
      </p>
    </div>
  );
}
