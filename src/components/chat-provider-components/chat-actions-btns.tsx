"use client";
import React, { useState } from "react";
import { BiDislike, BiLike } from "react-icons/bi";
import DevButton from "../dev-components/dev-button";
import ReactTooltip from "../dev-components/react-tooltip";
import ModifyResponse from "./modify-response";
import ShareChat from "./share-chat";
import { FiMoreVertical } from "react-icons/fi";
import DevPopover from "../dev-components/dev-popover";
import { MdContentCopy, MdOutlineFlag } from "react-icons/md";
import geminiZustand from "@/utils/gemini-zustand";
import { FcGoogle } from "react-icons/fc";
import { IoMdSearch } from "react-icons/io";
import { parseApiError } from "@/utils/chat-api-client";
import { formatUserFacingAiError } from "@/lib/ai/format-ai-error";


const ChatActionsBtns = ({
  chatID,
  llmResponse,
  userPrompt,
  shareMsg,
}: {
  chatID: string;
  llmResponse: string;
  userPrompt: string;
  shareMsg: string;
}) => {
  const { setToast, setErrorToast } = geminiZustand();
  const [googleRes, setGoogleRes] = useState<string[] | null>(null)
  const [loader, setLoader] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareMsg);
      setToast('Copied to clipboard')
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDoubleCheck = async () => {
    try {
      setLoader(true)
      const response = await fetch("/api/chat/double-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userPrompt }),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const data = (await response.json()) as { queries?: string[] };
      setGoogleRes(data.queries ?? [])
    } catch (error) {
      console.log(error)
      setErrorToast(formatUserFacingAiError(error));
    }
    finally {
      setLoader(false)
    }
  }
  return (
    <>
      <div className="w-full flex items-center gap-2 !text-2xl mt-2">
        {[
          { icon: BiLike, tipdata: "Good job" },
          { icon: BiDislike, tipdata: "Bad job" },
        ].map((item, index) => (
          <ReactTooltip key={index} tipData={item.tipdata}>
            <DevButton
              asIcon
              rounded="full"
              size="lg"
              variant="v2"
              className="opacity-80"
            >
              <item.icon />
            </DevButton>
          </ReactTooltip>
        ))}
        <ModifyResponse chatUniqueId={chatID} llmResponse={llmResponse} />
        <ShareChat shareMsg={shareMsg} />
        <ReactTooltip tipData="Double-check response">
          <DevButton
            asIcon
            rounded="full"
            onClick={handleDoubleCheck}
            size="lg"
            variant="v2"
            className="opacity-80"
          >
            {loader ? <span className="modal-loader"></span> : <FcGoogle />}
          </DevButton>
        </ReactTooltip>
        <DevPopover
          place="top-start"
          popButton={
            <ReactTooltip tipData="more">
              <DevButton
                asIcon
                rounded="full"
                size="lg"
                variant="v2"
                className="opacity-80"
              >
                <FiMoreVertical />
              </DevButton>
            </ReactTooltip>
          }
        >
          <div className="w-52 py-2">
            <DevButton
              onClick={copyToClipboard}
              variant="v3"
              className="w-full !justify-start gap-3 group"
              rounded="none"
            >
              <MdContentCopy className="text-xl" />
              Copy
            </DevButton>
            <DevButton
              variant="v3"
              className="w-full !justify-start gap-3 group"
              rounded="none"
            >
              <MdOutlineFlag className="text-xl" />
              Report legal issue
            </DevButton>
          </div>
        </DevPopover>
      </div>

      {googleRes && googleRes.length > 0 && <div className="w-full md:w-[90%] mt-5 mx-auto overflow-hidden p-5 rounded-2xl space-y-3 bg-accentGray/10">
        <h3>Search related topics</h3>
        <div className="space-y-1">
          {
            googleRes.map((item, index) => <DevButton target="_blank" variant="v2" href={`https://www.google.com/search?q=${item}`} className=" text-accentBlue/80 w-full !justify-start text-left flex items-center gap-2 hover:!bg-accentBlue/15" key={index}>
              <IoMdSearch className="text-xl" />
              <p className="truncate">{item}</p>
            </DevButton>)
          }
        </div>
      </div>}
    </>
  );
};

export default ChatActionsBtns;
