import { useEffect } from "react"
import { observer } from "mobx-react-lite";
import FishStore from "./FishStore";

const Fish = () => {

  useEffect(() => {
    window.addEventListener("fish", FishStore.handleFish);
    return () => {
      window.removeEventListener("fish", FishStore.handleFish);
    }
  })

  return (
    <div className={FishStore.className} onClick={FishStore.hide} >
      <div className="fish-message__info-mark">!</div>
      <div className="fish-message__message">{FishStore.text}</div>
    </div>
  )
}

export default observer(Fish)
