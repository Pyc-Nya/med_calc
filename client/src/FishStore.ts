import { makeAutoObservable } from "mobx";

type FishEventDetail = {
  message: string
  type: "success" | "error"
}

export interface FishEvent extends CustomEvent<FishEventDetail> {
  detail: FishEventDetail
}

class FishStoreClass {
  timeoutId: null | NodeJS.Timeout = null
  className: string = "fish-message fish-message__hide";
  infoMarkClassName: string = "fish-message__info-mark";
  text: string = "";

  constructor() {
    makeAutoObservable(this);
  }

  hide = () => {
    this.className = "fish-message fish-message__hide";
    this.clearTimeoutId();
  }

  clearTimeoutId = () => {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  handleFish = (event: Event) => {
    const e = event as FishEvent;
    
    if (this.timeoutId !== null) {
      this.hide();
      setTimeout(() => {
        this.update(e);
      }, 150);
    } else {
      this.update(e);
    }
  }

  update = (e: FishEvent) => {
    this.text = e.detail.message;
    this.className = "fish-message" + (e.detail.type === "success" ? " fish-message__success" : " fish-message__error");

    this.timeoutId = setTimeout(() => {
      this.hide();
    }, 5000);
  }
}

const FishStore = new FishStoreClass();
export default FishStore;
