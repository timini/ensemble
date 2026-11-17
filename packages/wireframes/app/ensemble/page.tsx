import { redirect } from "next/navigation"

/** Old wizard route. Redirects into the workspace, as the app will. */
export default function Page() {
  redirect("/workspace?state=ready&menu=models")
}
