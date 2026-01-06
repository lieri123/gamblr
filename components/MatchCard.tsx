import {betProfile} from "@/lib/actions/betting";
import {motion, useMotionValue, useTransform} from "framer-motion"

interface BetCardProps {
    bet: betProfile;
    onSwipe: (team: string, odds: number) => void;
}

export default function BetCard({bet, onSwipe}: BetCardProps) {

    const x  = useMotionValue(0);
    const opacity = useTransform(x,[-150,0,150], [0,1,0]);
    const rotate = useTransform(x, [-150,150], [-18,18]);
    const handleDragEnd = () => {
        if (x.get() > 50){
            onSwipe(bet.home_team, bet.home_odd);
        }
        else if (x.get()< -50){
            onSwipe(bet.away_team, bet.away_odd);
        }
        else{
            x.set(0);
        }
    }

    return (
        <motion.div className="card-container hover:cursor-grabbing active:cursor-grabbing" style={{
            x, opacity, rotate
        }} drag="x" dragConstraints={{left:0, right:0}} onDragEnd={handleDragEnd}>
            <div className="card-swipe">
                <div className="card-content">
                    <div className="team-row">
                        <span className="team-name">{bet.home_team}          (H)</span>
                        <span className="team-odd">{bet.home_odd}</span>
                    </div>
                    <div className="team-row">
                        <span className="team-name">{bet.away_team}           (A)</span>
                        <span className="team-odd">{bet.away_odd}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}