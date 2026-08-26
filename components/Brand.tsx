import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Herzliah Alumni Network home">
      <Image src="/herzliah-logo.png" alt="Herzliah" width={192} height={87} className="brandLogo" priority />
      <div className="brandText">
        <div className="brandName">Alumni Network</div>
        <div className="brandSub">Private · verified · connected</div>
      </div>
    </Link>
  );
}
