import { auth } from "@/auth";
import { getChatHistory } from "@/actions/actions";
import { redirect } from "next/navigation";
import MsgLoader from "@/components/chat-provider-components/msg-loader";
import OptimisticChat from "@/components/chat-provider-components/optimistic-chat";

const Page = async ({ params }: { params: { chat: string } }) => {
  const session = await auth();
  const { chat } = params;

  if (!session?.user?.id) redirect("/app");

  const fetchedData = await getChatHistory({
    chatID: chat,
    userID: session.user.id,
  });
  if (!fetchedData.success) redirect("/app");
  const { message } = fetchedData;
  const { name, image } = session.user as { name: string; image: string };

  return (
      <div className="w-full max-w-3xl mx-auto p-4 pb-40">
        <OptimisticChat message={message} name={name} image={image} />
        <MsgLoader name={name} image={image} />
      </div>
  );
};

export default Page;
