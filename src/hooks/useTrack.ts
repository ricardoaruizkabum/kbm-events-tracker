
import { tracker } from "../tracking/tracker";
export const useTrack = () => tracker.track.bind(tracker)
