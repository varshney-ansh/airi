export default function ChatItem({ chat, onClick, onDelete }) {
    const popoverId = `chat-options-${chat.chatId}`;
    const anchorName = `--anchor-${chat.chatId}`;

    return (
        <div
            onClick={onClick}
            className="flex size-full items-center justify-between pb-1.5 rounded-2xl hover:bg-bg-hover px-0.5 py-0.5 cursor-pointer transition-all duration-100 group/item"
        >
            <div className="flex h-full min-w-0 flex-1 items-center justify-between gap-1.5 px-2.5 font-medium text-text-muted text-[14px]">
                <p className="truncate text-text-muted" title={chat.chatTitle}>
                    {chat.chatTitle}
                </p>
            </div>

            <button
                popoverTarget={popoverId}
                style={{ anchorName: anchorName }}
                aria-label="View Options"
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="relative flex items-center justify-center text-xs outline-offset-1 rounded-lg size-6 opacity-0 group-hover/item:opacity-100 hover:bg-bg-hover transition-all duration-100"
            >
                <svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="size-4 text-text-muted">
                    <path d="M6.25 10C6.25 10.6904 5.69036 11.25 5 11.25C4.30964 11.25 3.75 10.6904 3.75 10C3.75 9.30964 4.30964 8.75 5 8.75C5.69036 8.75 6.25 9.30964 6.25 10ZM11.25 10C11.25 10.6904 10.6904 11.25 10 11.25C9.30964 11.25 8.75 10.6904 8.75 10C8.75 9.30964 9.30964 8.75 10 8.75C10.6904 8.75 11.25 9.30964 11.25 10ZM15 11.25C15.6904 11.25 16.25 10.6904 16.25 10C16.25 9.30964 15.6904 8.75 15 8.75C14.3096 8.75 13.75 9.30964 13.75 10C13.75 10.6904 14.3096 11.25 15 11.25Z"></path>
                </svg>
            </button>

            <div
                popover="auto"
                id={popoverId}
                style={{ positionAnchor: anchorName }}
                onClick={(e) => e.stopPropagation()}
                className="chat-options-menu bg-bg-modal border border-border-default rounded-xl shadow-2xl p-1 min-w-37.5"
            >
                <button
                    onClick={() => console.log('Rename', chat.chatId)}
                    className="cursor-pointer flex w-full font-medium items-center gap-1 rounded-lg px-3 py-2 text-[14px] text-text-primary hover:bg-bg-hover transition-all"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="me-1 size-5"><path d="M9.75 2H13.7484C14.1626 2 14.4984 2.33579 14.4984 2.75C14.4984 3.1297 14.2162 3.44349 13.8501 3.49315L13.7484 3.5H12.5V20.5H13.7451C14.1248 20.5 14.4385 20.7822 14.4882 21.1482L14.4951 21.25C14.4951 21.6297 14.2129 21.9435 13.8468 21.9932L13.7451 22H9.75C9.33579 22 9 21.6642 9 21.25C9 20.8703 9.28215 20.5565 9.64823 20.5068L9.75 20.5H11V3.5H9.75C9.3703 3.5 9.05651 3.21785 9.00685 2.85177L9 2.75C9 2.3703 9.28215 2.05651 9.64823 2.00685L9.75 2H13.7484H9.75ZM18.2457 4.99689C20.0402 4.99812 21.4947 6.45204 21.4966 8.24609L21.4995 15.751C21.5013 17.4837 20.1454 18.9007 18.4361 18.997L18.2497 19.0018L13.5054 19.0013V17.5013H18.3085C19.2484 17.4706 20.0005 16.699 19.9995 15.7521L19.9966 8.24717C19.9956 7.28104 19.2118 6.49755 18.2452 6.49689H13.5054V4.99689H18.2457ZM10 4.99689V6.49689H5.25C4.2835 6.49689 3.5 7.28039 3.5 8.24689V15.7513C3.5 16.7178 4.2835 17.5013 5.25 17.5013H9.99527V19.0013H5.25C3.45507 19.0013 2 17.5462 2 15.7513V8.24689C2 6.45196 3.45507 4.99689 5.25 4.99689H10Z"></path></svg>
                    Rename
                </button>
                <button
                    onClick={() => console.log('Share', chat.chatId)}
                    className="cursor-pointer flex w-full font-medium items-center gap-1 rounded-lg px-3 py-2 text-[14px] text-text-primary hover:bg-bg-hover transition-all"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="me-1 size-5"><path d="M14.7227 16.2211C14.43 16.5142 14.4303 16.9891 14.7234 17.2818C15.0165 17.5745 15.4914 17.5742 15.7841 17.2811L20.7807 12.2776C21.0732 11.9847 21.0731 11.5101 20.7804 11.2174L15.7838 6.21972C15.4909 5.9268 15.016 5.92675 14.7231 6.21962C14.4302 6.51248 14.4301 6.98735 14.723 7.28028L18.443 11H10.6012C9.00642 11 7.79015 11.242 6.71218 11.7645L6.46576 11.89C5.35728 12.4829 4.48286 13.3573 3.89004 14.4658C3.28062 15.6053 3 16.8837 3 18.6012C3 19.0154 3.33579 19.3512 3.75 19.3512C4.16421 19.3512 4.5 19.0154 4.5 18.6012C4.5 17.1174 4.72765 16.0802 5.21276 15.1732C5.66578 14.3261 6.32609 13.6658 7.17316 13.2128C8.01046 12.765 8.95858 12.5365 10.2666 12.5041L10.6012 12.5H18.438L14.7227 16.2211Z"></path></svg>
                    Share
                </button>
                <button
                    onClick={onDelete}
                    className="cursor-pointer flex w-full font-medium items-center gap-1 rounded-lg px-3 py-2 text-[14px] text-accent-red hover:bg-accent-red/10 transition-all"
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="me-1 size-5"><path d="M10 5H14C14 3.89543 13.1046 3 12 3C10.8954 3 10 3.89543 10 5ZM8.5 5C8.5 3.067 10.067 1.5 12 1.5C13.933 1.5 15.5 3.067 15.5 5H21.25C21.6642 5 22 5.33579 22 5.75C22 6.16421 21.6642 6.5 21.25 6.5H19.9309L18.7589 18.6112C18.5729 20.5334 16.9575 22 15.0263 22H8.97369C7.04254 22 5.42715 20.5334 5.24113 18.6112L4.06908 6.5H2.75C2.33579 6.5 2 6.16421 2 5.75C2 5.33579 2.33579 5 2.75 5H8.5ZM10.5 9.75C10.5 9.33579 10.1642 9 9.75 9C9.33579 9 9 9.33579 9 9.75V17.25C9 17.6642 9.33579 18 9.75 18C10.1642 18 10.5 17.6642 10.5 17.25V9.75ZM14.25 9C14.6642 9 15 9.33579 15 9.75V17.25C15 17.6642 14.6642 18 14.25 18C13.8358 18 13.5 17.6642 13.5 17.25V9.75C13.5 9.33579 13.8358 9 14.25 9ZM6.73416 18.4667C6.84577 19.62 7.815 20.5 8.97369 20.5H15.0263C16.185 20.5 17.1542 19.62 17.2658 18.4667L18.4239 6.5H5.57608L6.73416 18.4667Z"></path></svg>
                    Delete
                </button>
            </div>
        </div>
    );
}
