import Image from "next/image";
import { config } from "@/lib/config";

export default function Wordmark({className = "", tone = "ink",}: {
    className?: string;
    tone?: "ink" | "on-dark";
}) {
    return (
        <span className={`pf-wordmark ${tone === "on-dark" ? "pf-wordmark--dark" : ""} ${className}`}>
      <Image
          src="/brand/logo.svg"
          alt=""
          width={24}
          height={24}
          aria-hidden
      />

      <span className="pf-wordmark__text">
        {config.company.name}
      </span>
    </span>
    );
}
