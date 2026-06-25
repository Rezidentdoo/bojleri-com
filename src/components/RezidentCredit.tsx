import Link from "next/link";

const REZIDENT_URL = "https://www.rezident.rs";

type RezidentCreditProps = {
  variant?: "inline" | "footer";
};

export default function RezidentCredit({ variant = "inline" }: RezidentCreditProps) {
  if (variant === "footer") {
    return (
      <p className="text-[#999]">
        Izrada i održavanje:{" "}
        <Link
          href={REZIDENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#ff9900] hover:underline"
        >
          Rezident
        </Link>
        {" · "}
        <Link
          href={REZIDENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#ff9900] hover:underline"
        >
          www.rezident.rs
        </Link>
      </p>
    );
  }

  return (
    <Link
      href={REZIDENT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[#ff9900] hover:underline"
    >
      Rezident
    </Link>
  );
}