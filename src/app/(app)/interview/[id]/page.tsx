"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DeviceCheck } from "@/components/interview/DeviceCheck";
import { LiveSession } from "@/components/interview/LiveSession";
import { NotFound, PageLoading } from "@/components/PageStates";
import { useMediaStream } from "@/hooks/useMediaStream";
import type { VoiceGender } from "@/hooks/useVoice";
import { effectiveLanguage } from "@/lib/catalog";
import { readGender, saveGender } from "@/lib/prefs";
import { useInterview } from "@/lib/storage";

export default function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const interview = useInterview(id);
  const media = useMediaStream();
  const [live, setLive] = useState(false);
  const [gender, setGender] = useState<VoiceGender>("female");

  useEffect(() => {
    // Per-browser preference; read after mount to keep SSR markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGender(readGender());
  }, []);

  function chooseGender(g: VoiceGender) {
    setGender(g);
    saveGender(g);
  }

  // Ask for camera + mic straight away; the button is only a retry.
  const requestMedia = media.request;
  useEffect(() => {
    void requestMedia();
  }, [requestMedia]);

  const completed = interview?.status === "completed";
  useEffect(() => {
    if (completed) router.replace(`/interview/${id}/report`);
  }, [completed, id, router]);

  if (interview === undefined || completed) return <PageLoading />;
  if (interview === null) return <NotFound />;

  const lang = effectiveLanguage(interview.config.type, interview.config.language ?? "uz");

  if (live) return <LiveSession interview={interview} stream={media.stream} lang={lang} gender={gender} />;

  return (
    <DeviceCheck
      interview={interview}
      lang={lang}
      gender={gender}
      onGender={chooseGender}
      stream={media.stream}
      status={media.status}
      error={media.error}
      onRequest={() => void media.request()}
      onStart={() => setLive(true)}
    />
  );
}
