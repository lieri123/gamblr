"use client"

import Image from "next/image";
import {LEAGUES} from "@/lib/league";


type Props = {
    selected: string[];
    onChange: (leagues: string[]) => void;
};

export default function LeagueSelector({ selected, onChange }: Props) {
    function toggle(id: string) {
        if (selected.includes(id)) {
            onChange(selected.filter((l) => l !== id));
        } else {
            onChange([...selected, id]);
        }
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">

        {LEAGUES.map((league) => {
                const active = selected.includes(league.id);
                return (
                    <button
                        key={league.id}
                        type="button"
                        onClick={() => toggle(league.id)}
                        className="flex flex-col items-center gap-2"
                    >
                        <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center
                bg-gray-800 transition
                ${active ? "ring-2 ring-pink-500" : ""}`}
                        >
                            <Image src={league.icon} alt={league.name} width={32} height={32} />
                        </div>
                        <span className="text-xs text-gray-700 dark:text-gray-300">
              {league.name}
            </span>
                    </button>
                );
            })}
        </div>
    );
}