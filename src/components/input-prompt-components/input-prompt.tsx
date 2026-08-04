"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import geminiZustand from "@/utils/gemini-zustand";
import { useParams, useRouter } from "next/navigation";
import { createChat } from "@/actions/actions";
import { nanoid } from "nanoid";
import { useMeasure } from "react-use";
import { User } from "next-auth";
import InputActions from "./input-actions";
import KnowledgePanel from "./knowledge-panel";
import Link from "next/link";
import { MdImageSearch } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import {
  fileToBase64Image,
  parseApiError,
  readImageIdHeader,
  readMemoryHeaders,
  readRagSourcesHeader,
  readTextStream,
} from "@/utils/chat-api-client";
import { readAgentStream } from "@/utils/agent-api-client";
import type { AgentStep, VisionPresetId } from "@/types/types";
import { VISION_PRESETS } from "@/lib/ai/vision-presets";

function formatMemoryHint(hint: {
  turnCount: number;
  didSummarize: boolean;
  hasSummary: boolean;
}) {
  if (hint.turnCount <= 0) {
    return "Starting a new conversation";
  }
  const base = `Using full conversation context · ${hint.turnCount} prior turn${
    hint.turnCount === 1 ? "" : "s"
  }`;
  if (hint.didSummarize) {
    return `${base} · older turns summarized`;
  }
  if (hint.hasSummary) {
    return `${base} · with running summary`;
  }
  return base;
}

const InputPrompt = ({ user }: { user?: User }) => {
  const {
    currChat,
    setCurrChat,
    setToast,
    customPrompt,
    setInputImgName,
    inputImgName,
    setMsgLoader,
    msgLoader,
    optimisticResponse,
    setUserData,
    setOptimisticResponse,
    setOptimisticPrompt,
    selectedModel,
    setSelectedModel,
    memoryHint,
    setMemoryHint,
    useKnowledge,
    setUseKnowledge,
    setKnowledgeDocCount,
    setOptimisticRagSources,
    chatMode,
    setChatMode,
    setOptimisticAgentSteps,
    setLiveAgentSteps,
    visionPreset,
    setVisionPreset,
    inputImageId,
    setInputImageId,
  } = geminiZustand();
  const [inputImg, setInputImg] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const { chat } = useParams();
  const router = useRouter();
  const [inputRref] = useMeasure<HTMLTextAreaElement>();
  const newChatIdRef = useRef(nanoid());
  const prevChatParamRef = useRef(chat);
  const chatID =
    typeof chat === "string" && chat.length > 0 ? chat : newChatIdRef.current;
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  // Navigating from /app/[chat] → /app starts a fresh thread id.
  useEffect(() => {
    const prev = prevChatParamRef.current;
    const hadChat = typeof prev === "string" && prev.length > 0;
    const hasChat = typeof chat === "string" && chat.length > 0;
    prevChatParamRef.current = chat;

    if (hadChat && !hasChat) {
      newChatIdRef.current = nanoid();
    }
    setMemoryHint(null);
  }, [chat, setMemoryHint]);

  useEffect(() => {
    if (user) {
      setUserData(user);
      fetch("/api/rag/documents")
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            documents?: { id: string }[];
          };
          setKnowledgeDocCount(data.documents?.length ?? 0);
        })
        .catch(() => undefined);
    }
  }, [user, setUserData, setKnowledgeDocCount]);

  useEffect(() => {
    if (!inputImg) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(inputImg);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [inputImg]);

  const generateMsg = useCallback(async () => {
    const hasPrompt = Boolean(currChat.userPrompt?.trim());
    const hasImage = Boolean(inputImg || inputImageId);
    if ((!hasPrompt && !(hasImage && visionPreset)) || !user) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    cancelledRef.current = false;

    router.push(`/app/${chatID}#new-chat`);
    const rawPrompt = currChat.userPrompt;
    const rawImage = inputImgName;
    const rawVisionPreset = visionPreset;

    try {
      setMsgLoader(true);
      setLiveAgentSteps([]);

      let imagePayload: { data: string; mimeType: string } | null = null;
      if (inputImg && chatMode === "chat") {
        imagePayload = await fileToBase64Image(inputImg);
      }

      let ragSources: ReturnType<typeof readRagSourcesHeader> = [];
      let agentSteps: AgentStep[] = [];
      let savedImageId = inputImageId;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: rawPrompt,
          chatID,
          customPrompt: customPrompt.prompt,
          model: selectedModel,
          mode: chatMode,
          useKnowledge: chatMode === "chat" && useKnowledge && !imagePayload,
          visionPreset: imagePayload ? rawVisionPreset : null,
          imageId: !imagePayload ? inputImageId : null,
          image: imagePayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setMemoryHint(readMemoryHeaders(response));
      const responseImageId = readImageIdHeader(response);
      if (responseImageId) {
        savedImageId = responseImageId;
        setInputImageId(responseImageId);
      }

      let text = "";

      if (chatMode === "agent") {
        const agentResult = await readAgentStream(
          response,
          {
            onStep: (step) => {
              const prev = geminiZustand.getState().liveAgentSteps;
              let next = prev;
              if (step.status === "running") {
                next = [...prev.filter((s) => s.tool !== step.tool), step];
              } else {
                const idx = prev.findIndex(
                  (s) => s.tool === step.tool && s.status === "running"
                );
                if (idx >= 0) {
                  next = [...prev];
                  next[idx] = step;
                } else {
                  next = [...prev, step];
                }
              }
              setLiveAgentSteps(next);
            },
            onText: (accumulated) => {
              if (!cancelledRef.current) {
                setCurrChat("llmResponse", accumulated);
              }
            },
          },
          controller.signal
        );
        text = agentResult.text;
        agentSteps = agentResult.agentSteps;
        setOptimisticAgentSteps(agentSteps.length > 0 ? agentSteps : null);
      } else {
        ragSources = readRagSourcesHeader(response);
        setOptimisticRagSources(ragSources.length > 0 ? ragSources : null);

        text = await readTextStream(
          response,
          (accumulated) => {
            if (!cancelledRef.current) {
              setCurrChat("llmResponse", accumulated);
            }
          },
          controller.signal
        );
      }

      if (cancelledRef.current || controller.signal.aborted) {
        setOptimisticResponse("User has aborted the request");
        return;
      }

      if (!text) return;

      setOptimisticPrompt(rawPrompt);
      setOptimisticResponse(text);
      setMsgLoader(false);
      setCurrChat("userPrompt", null);

      await createChat({
        chatID,
        userID: user?.id as string,
        imgName: rawImage ?? undefined,
        imageId: savedImageId ?? undefined,
        userPrompt: rawPrompt,
        llmResponse: text,
        ragSources: ragSources.length > 0 ? ragSources : undefined,
        agentSteps: agentSteps.length > 0 ? agentSteps : undefined,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setOptimisticResponse("User has aborted the request");
        return;
      }
      console.error("Error generating message:", error);
      setToast(
        error instanceof Error ? error.message : "Failed to generate response"
      );
    } finally {
      setMsgLoader(false);
      setInputImg(null);
      setInputImgName(null);
      setInputImageId(null);
      setVisionPreset(null);
      setCurrChat("userPrompt", null);
      setCurrChat("llmResponse", null);
      setLiveAgentSteps([]);
      if (!cancelledRef.current) {
        setOptimisticResponse(null);
        setOptimisticPrompt(null);
        setOptimisticRagSources(null);
        setOptimisticAgentSteps(null);
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [
    currChat.userPrompt,
    user,
    chatID,
    customPrompt.prompt,
    selectedModel,
    useKnowledge,
    chatMode,
    inputImg,
    inputImgName,
    inputImageId,
    visionPreset,
    setInputImageId,
    setVisionPreset,
    setCurrChat,
    setMsgLoader,
    setOptimisticPrompt,
    setOptimisticResponse,
    setOptimisticRagSources,
    setOptimisticAgentSteps,
    setLiveAgentSteps,
    setInputImgName,
    setToast,
    setMemoryHint,
    router,
  ]);

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCurrChat("userPrompt", e.target.value);
    },
    [setCurrChat]
  );

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    abortRef.current?.abort();
    setOptimisticResponse("User has aborted the request");
    setMsgLoader(false);
  }, [setOptimisticResponse, setMsgLoader]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!user) {
        setToast("Please sign in to use Gemini!");
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const canSend =
          Boolean(currChat.userPrompt?.trim()) ||
          Boolean(inputImgName && visionPreset);
        if (!canSend) return;
        cancelledRef.current = false;
        generateMsg();
      }
    },
    [generateMsg, user, setToast, currChat.userPrompt, inputImgName, visionPreset]
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const file = event.target.files[0];
      setInputImg(file);
      setInputImgName(file.name);
      setInputImageId(null);
      setVisionPreset(null);
    }
  };

  const clearImage = () => {
    setInputImgName(null);
    setInputImg(null);
    setInputImageId(null);
    setVisionPreset(null);
  };

  return (
    <div className=" flex-shrink-0 w-full md:px-10 px-5 pb-2 space-y-2 bg-white dark:bg-[#131314]">
      {inputImgName && (
        <div className="max-w-4xl overflow-hidden w-full mx-auto space-y-2">
          <div className="p-5 w-fit relative max-w-full overflow-hidden bg-rtlLight group dark:bg-rtlDark rounded-t-3xl flex items-start gap-3">
            {imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreviewUrl}
                alt={inputImgName}
                className="h-16 w-16 rounded-lg object-cover shrink-0"
              />
            ) : (
              <MdImageSearch className="text-4xl shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-lg font-semibold truncate">{inputImgName}</p>
              <p className="text-xs opacity-70">Image will be saved to your account</p>
            </div>
            <IoMdClose
              onClick={clearImage}
              className="absolute top-1 right-1 text-2xl rounded-full cursor-pointer hover:opacity-100 hidden group-hover:block opacity-80 bg-accentGray/40 p-1"
            />
          </div>
          {chatMode === "chat" && (
            <div className="flex flex-wrap gap-2 px-1">
              {VISION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={msgLoader}
                  onClick={() =>
                    setVisionPreset(
                      visionPreset === preset.id ? null : (preset.id as VisionPresetId)
                    )
                  }
                  className={`text-xs md:text-sm px-3 py-1.5 rounded-full border transition ${
                    visionPreset === preset.id
                      ? "border-accentBlue bg-accentBlue/15 text-accentBlue"
                      : "border-accentGray/30 opacity-80 hover:opacity-100"
                  }`}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div
        className={`w-full md:border-8 border-4 relative border-rtlLight dark:border-rtlDark max-w-4xl mx-auto min-h-16 md:rounded-[50px] rounded-2xl ${
          inputImgName && " !rounded-tl-none "
        } overflow-hidden bg-rtlLight dark:bg-rtlDark flex gap-1 md:items-center md:justify-between md:flex-row flex-col `}
      >
        <div className="flex items-center gap-2 pl-4 pt-2 md:pt-0 flex-wrap">
          <label htmlFor="model-select" className="sr-only">
            Model
          </label>
          <select
            id="model-select"
            value={selectedModel}
            disabled={msgLoader}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-xs md:text-sm bg-transparent border border-accentGray/30 rounded-full px-3 py-1 outline-none opacity-80 hover:opacity-100"
          >
            <option value="gemini-1.5-flash">Flash</option>
            <option value="gemini-1.5-pro">Pro</option>
          </select>
          <div className="flex rounded-full border border-accentGray/30 p-0.5 text-xs md:text-sm">
            {(["chat", "agent"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={msgLoader}
                onClick={() => setChatMode(mode)}
                className={`px-3 py-1 rounded-full capitalize transition ${
                  chatMode === mode
                    ? "bg-accentBlue/20 text-accentBlue"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {user && chatMode === "chat" && (
            <>
              <label className="flex items-center gap-2 text-xs md:text-sm opacity-80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useKnowledge}
                  disabled={msgLoader || Boolean(inputImgName)}
                  onChange={(e) => setUseKnowledge(e.target.checked)}
                  className="accent-accentBlue"
                />
                Knowledge
              </label>
              <KnowledgePanel disabled={msgLoader} />
            </>
          )}
        </div>
        <textarea
          name="prompt"
          ref={inputRref}
          disabled={msgLoader}
          placeholder={
            customPrompt.placeholder
              ? customPrompt.placeholder
              : "Enter a prompt here"
          }
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          value={optimisticResponse || msgLoader ? "" : currChat.userPrompt || ""}
          className={`flex-1 bg-transparent rounded-4xl p-2 pl-6 outline-none text-lg max-h-56 resize-none`}
        />
        <InputActions
          handleCancel={handleCancel}
          handleImageUpload={handleImageUpload}
          generateMsg={generateMsg}
          canSubmit={Boolean(
            currChat.userPrompt?.trim() || (inputImgName && visionPreset)
          )}
        />
      </div>
      {chatMode === "agent" && (
        <p className="text-xs text-center text-violet-600/80 dark:text-violet-300/80 max-w-4xl mx-auto">
          Agent mode on — the assistant can use calculator, web search, date/time, and your recent chats.
        </p>
      )}
      {useKnowledge && chatMode === "chat" && (
        <p className="text-xs text-center text-accentBlue/70 max-w-4xl mx-auto">
          Knowledge mode on — answers will cite your uploaded documents when relevant.
        </p>
      )}
      {memoryHint && (
        <p className="text-xs text-center text-accentBlue/80 max-w-4xl mx-auto">
          {formatMemoryHint(memoryHint)}
        </p>
      )}
      <p className="text-xs font-light opacity-80 text-center">
        Gemini may display inaccurate info, including about people, so
        double-check its responses.{" "}
        <Link className="underline" href="/">
          Your privacy & Gemini Apps
        </Link>
      </p>
    </div>
  );
};

export default InputPrompt;
