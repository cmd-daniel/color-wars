import type { ReactNode } from "react";

interface ActionAreaProps {
  children?: ReactNode;
}

const ActionArea = ({ children }: ActionAreaProps) => {
  return (
    <div className="fixed right-0 bottom-0 left-0 flex w-full justify-center">
      <div className="flex w-full max-w-[420px] flex-col gap-0.5 p-2">
        <div className="bg-secondary flex min-h-[16vh] items-center justify-center rounded-xl">
          {children}
        </div>
        <div className="bg-secondary flex h-12 items-center justify-center rounded-lg">
          {"<Chat/>"}
        </div>
      </div>
    </div>
  );
};

export default ActionArea;
