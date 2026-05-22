import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <>
      <h1 className="mb-2 font-display text-2xl font-semibold tracking-tight text-text-primary">
        {t("signupTitle")}
      </h1>
      <p className="mb-8 text-sm text-text-secondary">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary-500 underline-offset-4 hover:underline"
        >
          {t("loginButton")}
        </Link>
      </p>
      <SignupForm />
    </>
  );
}
