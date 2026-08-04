"use client";

import { MessageProps } from "@/types/types";
import React, { useEffect, useOptimistic } from "react";
import ChatProvider from "./chat-provider";
import geminiZustand from "@/utils/gemini-zustand";

const OptimisticChat = ({
  message,
  name,
  image,
}: {
  message: MessageProps[];
  name: string;
  image: string;
}) => {
  const [optimisticChats, addOptimisticChat] = useOptimistic(
    message,
    (state, newChat: MessageProps) => [...state, newChat]
  );
  const {
    optimisticPrompt,
    optimisticResponse,
    inputImgName,
    inputImageId,
    optimisticRagSources,
    optimisticAgentSteps,
    setPrevChat,
  } = geminiZustand();

  useEffect(() => {
    if (optimisticResponse) {
      addOptimisticChat({
        _id: Date.now().toString(),
        message: {
          imgName: inputImgName ?? undefined,
          imageId: inputImageId ?? undefined,
          userPrompt: optimisticPrompt ?? "",
          llmResponse: optimisticResponse ?? "",
          ragSources: optimisticRagSources ?? undefined,
          agentSteps: optimisticAgentSteps ?? undefined,
        },
      });
    }
    if (message && message.length > 0) {
      setPrevChat(message[message.length - 1].message);
    }
  }, [
    optimisticResponse,
    optimisticRagSources,
    optimisticAgentSteps,
    message,
    optimisticPrompt,
    inputImgName,
    inputImageId,
    addOptimisticChat,
    setPrevChat,
  ]);

  return (
    <>
      {optimisticChats.map((chat: MessageProps) => (
        <div key={chat._id} className="my-16 mt-10">
          <ChatProvider
            chatUniqueId={chat._id}
            imgInfo={{ imgSrc: image, imgAlt: name }}
            imgName={chat.message.imgName}
            imageId={chat.message.imageId}
            llmResponse={chat.message.llmResponse}
            userPrompt={chat.message.userPrompt}
            ragSources={chat.message.ragSources}
            agentSteps={chat.message.agentSteps}
          />
        </div>
      ))}
    </>
  );
};

export default OptimisticChat;
