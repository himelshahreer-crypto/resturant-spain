import { pageMetadata } from "@/lib/seo";
import { MenuPage } from "../../pages";

export const metadata = pageMetadata("es", "menu");

export default function Page() {
  return <MenuPage locale="es" />;
}
