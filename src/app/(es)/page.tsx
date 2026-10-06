import { pageMetadata } from "@/lib/seo";
import { HomePage } from "../pages";

export const metadata = pageMetadata("es", "home");

export default function Page() {
  return <HomePage locale="es" />;
}
