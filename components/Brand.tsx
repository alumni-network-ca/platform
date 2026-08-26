import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Herzliah Alumni Network home">
      <Image src="/herzliah-logo.png" alt="Herzliah logo" width={68} height={68} className="brandLogo brandIcon" priority />
      <div className="brandText">
        <div className="brandName">Herzliah Alumni Network</div>
        <div className="brandSub">Private · verified · connected</div>
      </div>
    </Link>
  );
}
