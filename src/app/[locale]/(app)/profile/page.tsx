import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/profile/queries";
import { AppPageShell } from "@/components/layout/app-page-shell";
import { PageHero } from "@/components/layout/page-hero";
import { SectionPanel } from "@/components/layout/section-panel";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { DisplayNameForm } from "@/components/profile/display-name-form";
import { UserRound } from "lucide-react";
import type { Locale } from "@/i18n/routing";

export default async function ProfilePage() {
  const locale = (await getLocale()) as Locale;
  const fr = locale === "fr";
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const initials = (user.display_name || user.username || "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppPageShell width="wide">
      <PageHero
        kicker={fr ? "Mon profil" : "My profile"}
        kickerIcon={UserRound}
        accent="primary"
        title={fr ? "Ton profil" : "Your profile"}
        description={
          fr
            ? "Ajoute une photo et choisis le nom affiché dans la ligue et le classement."
            : "Add a photo and choose the name shown across the league and leaderboard."
        }
      />

      <SectionPanel
        icon={UserRound}
        title={fr ? "Photo & nom affiché" : "Photo & display name"}
        accent="primary"
      >
        <div className="space-y-6">
          <AvatarUploader
            userId={user.id}
            currentUrl={user.avatar_url}
            initials={initials}
            locale={locale}
          />
          <div className="border-t border-white/[0.07] pt-5">
            <DisplayNameForm current={user.display_name} locale={locale} />
          </div>
        </div>
      </SectionPanel>

      <p className="text-center text-xs text-text-tertiary">
        @{user.username} · {user.email}
      </p>
    </AppPageShell>
  );
}
