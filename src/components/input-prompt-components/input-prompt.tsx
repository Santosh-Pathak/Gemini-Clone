"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import geminiZustand from "@/utils/gemini-zustand";
import { useParams, useRouter } from "next/navigation";
import { createChat } from "@/actions/actions";
import { nanoid } from "nanoid";
import { useMeasure } from "react-use";
import { User } from "next-auth";
import InputActions from "./input-actions";
import Link from "next/link";
import { MdImageSearch } from "react-icons/md";
import { IoMdClose } from "react-icons/io";
import {
  fileToBase64Image,
  parseApiError,
  readTextStream,
} from "@/utils/chat-api-client";

const InputPrompt = ({ user }: { user?: User }) => {
  const {
    currChat,
    setCurrChat,
    setToast,
    customPrompt,
    setInputImgName,
    inputImgName,
    setMsgLoader,
    prevChat,
    msgLoader,
    optimisticResponse,
    setUserData,
    setOptimisticResponse,
    setOptimisticPrompt,
  } = geminiZustand();
  const [inputImg, setInputImg] = useState<File | null>(null);

  const { chat } = useParams();
  const router = useRouter();
  const [inputRref] = useMeasure<HTMLTextAreaElement>();
  const chatID = (chat as string) || nanoid();
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

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

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: rawPrompt,
          previousUserPrompt: prevChat.userPrompt,
          previousLlmResponse: prevChat.llmResponse,
          customPrompt: customPrompt.prompt,
          image: imagePayload,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      let text = await readTextStream(
        response,
        (accumulated) => {
          if (!cancelledRef.current) {
            setCurrChat("llmResponse", accumulated);
          }
        },
        controller.signal
      );

      if (cancelledRef.current) {
        text = "User has aborted the request";
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
      setOptimisticResponse(null);
      setOptimisticPrompt(null);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [
    currChat.userPrompt,
    user,
    chatID,
    prevChat,
    customPrompt.prompt,
    inputImg,
    inputImgName,
    setCurrChat,
    setMsgLoader,
    setOptimisticPrompt,
    setOptimisticResponse,
    setInputImgName,
    setToast,
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

  useEffect(() => {
    if (user) {
      setUserData(user);
    }
  }, [user, setUserData]);

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
