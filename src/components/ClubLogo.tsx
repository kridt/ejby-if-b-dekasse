/* Ejby IF Fodbold — det rigtige klublogo.
   Vises på en hvid afrundet "chip" så det altid er tydeligt (også i mørkt tema). */

export function ClubLogo({ size = 64, chip = true }: { size?: number; chip?: boolean }) {
  if (!chip) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/ejbyif-topnav.png"
        alt="Ejby IF Fodbold"
        width={size}
        height={size}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/ejbyif-topnav.png"
        alt="Ejby IF Fodbold"
        style={{ width: size * 0.78, height: size * 0.78, objectFit: "contain" }}
      />
    </div>
  );
}
