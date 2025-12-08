import type { ReactNode } from 'react';

interface ActionAreaProps {
	children?: ReactNode;
}

const ActionArea = ({ children }: ActionAreaProps) => {
	return (
		<div className='fixed bottom-0 right-0 left-0 w-full flex justify-center'>
			<div className="flex flex-col w-full gap-0.5 p-2 max-w-[420px]">
				<div className="bg-secondary rounded-xl flex items-center justify-center min-h-[16vh]">{children}</div>
				<div className="bg-secondary rounded-lg flex items-center justify-center h-12">{'<Chat/>'}</div>
			</div>
		</div>
		
	);
};

export default ActionArea;
