import type { ReactNode } from "react";
import ChatInterface from "./MobileChat/MobileChat";

interface ActionAreaProps {
  children?: ReactNode;
}

const ActionArea = ({ children }: ActionAreaProps) => {
  return (
    <div className="fixed right-0 bottom-0 left-0 flex w-full justify-center ">
      <div className="flex w-full flex-col gap-0.5 pb-2 px-2 max-w-[720px] bg-background">
        <div className="bg-secondary flex min-h-[16vh] items-center justify-center rounded-xl drop-shadow-[0px_-8px_8px_#000000] p-4 z-10">
          {children}
        </div>
        <div className="bg-secondary flex h-12 items-center justify-center rounded-lg">
          <ChatInterface/>
        </div>
      </div>
    </div>
  );
};

export default ActionArea;
