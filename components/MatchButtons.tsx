interface MatchButtonsProps {
    onRight: () => void;
    onLeft: () => void;
    onPass: () => void;
    disableRight?: boolean;
    disableLeft?: boolean;
}

export default function MatchButtons({
    onRight,
    onLeft,
    onPass,
    disableRight = false,
    disableLeft = false,
}: MatchButtonsProps) {
    return (
        <div className="flex items-center justify-center gap-8">
            <button
                onClick={onLeft}
                disabled={disableLeft}
                className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 hover:border-red-500 dark:hover:border-red-500 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Bet on the away team"
            >
                <span className="text-red-500 font-semibold">Away</span>
            </button>

            <button
                onClick={onPass}
                className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 hover:border-gray-500"
                aria-label="Skip this game"
            >
                <svg
                    className="w-8 h-8 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </button>

            <button
                onClick={onRight}
                disabled={disableRight}
                className="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-500 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Bet on the home team"
            >
                <span className="text-green-500 font-semibold text-lg">Home</span>
            </button>
        </div>
    );
}
