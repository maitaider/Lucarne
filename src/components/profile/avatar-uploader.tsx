"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { updateAvatarUrlAction } from "@/lib/profile/actions";
import { useRouter } from "@/i18n/navigation";
import { useToast } from "@/components/ui/toast-provider";
import { Camera, Loader2, Trash2 } from "lucide-react";
import type { Locale } from "@/i18n/routing";

const MAX_BYTES = 5 * 1024 * 1024;

export function AvatarUploader({
  userId,
  currentUrl,
  initials,
  locale,
}: {
  userId: string;
  currentUrl: string | null;
  initials: string;
  locale: Locale;
}) {
  const fr = locale === "fr";
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(fr ? "Choisis une image." : "Pick an image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(fr ? "Image trop lourde (max 5 Mo)." : "Image too large (max 5 MB).");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await updateAvatarUrlAction(data.publicUrl);
      if (!res.ok) throw new Error(res.error);
      setUrl(data.publicUrl);
      toast.success(fr ? "Photo mise à jour." : "Photo updated.");
      router.refresh();
    } catch (err) {
      toast.error(
        (err as Error).message ||
          (fr ? "Échec du téléversement." : "Upload failed."),
      );
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onRemove() {
    setBusy(true);
    const res = await updateAvatarUrlAction(null);
    if (res.ok) {
      setUrl(null);
      toast.success(fr ? "Photo retirée." : "Photo removed.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-white/[0.12] bg-surface-2">
        {url ? (
          <Image src={url} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-primary-500/15 font-display text-xl font-bold text-primary-300">
            {initials}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="size-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onPick}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-[8px] border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-text-primary transition hover:border-primary-500/40 disabled:opacity-60"
        >
          <Camera className="size-4" />
          {fr ? "Changer la photo" : "Change photo"}
        </button>
        {url && (
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary transition hover:text-error disabled:opacity-60"
          >
            <Trash2 className="size-3.5" />
            {fr ? "Retirer" : "Remove"}
          </button>
        )}
        <p className="text-[11px] text-text-tertiary">
          {fr ? "PNG, JPG, WebP ou GIF · max 5 Mo." : "PNG, JPG, WebP or GIF · max 5 MB."}
        </p>
      </div>
    </div>
  );
}
