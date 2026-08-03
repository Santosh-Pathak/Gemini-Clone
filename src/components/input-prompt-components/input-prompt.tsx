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
  readMemoryHeaders,
  readRagSourcesHeader,
  readTextStream,
} from "@/utils/chat-api-client";

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
  } = geminiZustand();
  const [inputImg, setInputImg] = useState<File | null>(null);

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

  const generateMsg = useCallback(async () => {
    if (!currChat.userPrompt?.trim() || !user) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    cancelledRef.current = false;

    router.push(`/app/${chatID}#new-chat`);
    const rawPrompt = currChat.userPrompt;
    const rawImage = inputImgName;

    try {
      setMsgLoader(true);

      let imagePayload: { data: string; mimeType: string } | null = null;
      if (inputImg) {
        imagePayload = await fileToBase64Image(inputImg);
      }

      let ragSources: ReturnType<typeof readRagSourcesHeader> = [];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: rawPrompt,
          chatID,
          customPrompt: customPrompt.prompt,
          model: selectedModel,
          useKnowledge: useKnowledge && !imagePayload,
          image: imagePayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      setMemoryHint(readMemoryHeaders(response));
      ragSources = readRagSourcesHeader(response);
      setOptimisticRagSources(ragSources.length > 0 ? ragSources : null);

      let text = await readTextStream(
        response,
        (accumulated) => {
          if (!cancelledRef.current) {
            setCurrChat("llmResponse", accumulated);
          }
        },
        controller.signal
      );

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
        userPrompt: rawPrompt,
        llmResponse: text,
        ragSources: ragSources.length > 0 ? ragSources : undefined,
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
      setCurrChat("userPrompt", null);
      setCurrChat("llmResponse", null);
      if (!cancelledRef.current) {
        setOptimisticResponse(null);
        setOptimisticPrompt(null);
        setOptimisticRagSources(null);
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
    inputImg,
    inputImgName,
    setCurrChat,
    setMsgLoader,
    setOptimisticPrompt,
    setOptimisticResponse,
    setOptimisticRagSources,
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
        cancelledRef.current = false;
        generateMsg();
      }
    },
    [generateMsg, user, setToast]
  );

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target && event.target.files) {
      const file = event.target.files[0];
      setInputImg(file);
      setInputImgName(file.name);
    }
  };

  return (
    <div className=" flex-shrink-0 w-full md:px-10 px-5 pb-2 space-y-2 bg-white dark:bg-[#131314]">
      {inputImgName && (
        <div className="max-w-4xl overflow-hidden w-full mx-auto">
          <div className="p-5 w-fit relative max-w-full overflow-hidden bg-rtlLight group dark:bg-rtlDark rounded-t-3xl flex items-start gap-2">
            <MdImageSearch className="text-4xl" />
            <p className="text-lg font-semibold truncate"> {inputImgName}</p>
            <IoMdClose
              onClick={() => {
                setInputImgName(null);
                setInputImg(null);
              }}
              className="absolute top-1 right-1 text-2xl rounded-full cursor-pointer hover:opacity-100 hidden group-hover:block opacity-80 bg-accentGray/40 p-1"
            />
          </div>
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
          {user && (
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
        />
      </div>
      {useKnowledge && (
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
