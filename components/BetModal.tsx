
import {useState} from "react";


type BetModalProps = {
    team: string;
    odds: number;
    onClose: () => void;       // a function that returns nothing
    onConfirm: (amount:number) => void;     // same here, adjust if it takes arguments
};

export default function BetModal({ team, odds, onClose, onConfirm }:BetModalProps ) {
    const [amount, setAmount] = useState<string>("");

    if (odds > 0){
        odds = 1 + odds/100;
    }
    else if (odds < 0){
        odds = 1 + 100 / Math.abs(odds);
    }

    odds = Math.floor(odds * 100) / 100;


    const numericAmount = parseFloat(amount);
    const estimated =
        !isNaN(numericAmount)
            ? (numericAmount * odds).toFixed(2)
            : "0.00";

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-xl shadow-xl w-80 p-4">

                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-700">
                        Predicting:
                    </p>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                </div>

                {/* Team */}
                <h2 className="text-lg font-bold text-gray-900 text-center mb-3">
                    {team}
                </h2>

                <div className="flex items-center border rounded-lg overflow-hidden mb-3">
                    <span className="px-3 bg-gray-100 text-gray-600 font-semibold">
                        %
                    </span>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 outline-none"
                    />
                    <span className="px-3 text-green-600 font-semibold">
                        ×{odds}
                    </span>
                </div>


                <p className="font-semibold text-gray-800 mb-4">
                    Payout: <span className="text-green-600">${estimated}</span>
                </p>

                {/* Button */}
                <button
                    onClick={() => onConfirm(parseFloat(amount) || 0)}
                    className="w-full py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold transition"
                >
                    Place Bet
                </button>

            </div>
        </div>
    );
}