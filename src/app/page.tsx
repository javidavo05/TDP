import { redirect } from "next/navigation";

export default function HomePage() {
  // Redirect to public landing page
  redirect("/search");
}

