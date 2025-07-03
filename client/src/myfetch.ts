export const host = () => `http://${window.location.hostname}:3001`;
export const BASE_IMG_URL = `${host()}/prod-images`;

async function myfetch(path: string, param: RequestInit = {}, fishMessage: string, successMessage: boolean = false): Promise<Response> {
  path = host() + path;
  // param.credentials = 'include';
  param.headers = {
    "Content-Type": "application/json",
    // "authorization": "Bearer 1",
  };
  // console.log(`fetch to ${path}, method: ${param.method ?? "GET"}`);

  if (navigator.onLine) {
    try {
      const r = await fetch(path, param);
      if (!(200 <= r.status && r.status < 300)) {
        throw new Error('fish!');
      }
      
      if (successMessage) {
        const userDescription = `Успешно сохранено.`;
        const event = new CustomEvent('fish', { detail: {message: userDescription, type: "success"} });
        window.dispatchEvent(event);
      }
      return r;
    } catch (error) {
      const e = error as Error;
      console.log('fish!');
      const userDescription = `Кажется, произошла ошибка при попытке ${fishMessage}.`;
      const event = new CustomEvent('fish', { detail: {message: userDescription, type: "error"} });
      window.dispatchEvent(event);
      throw e; 
    }
  } else {
    const responseBody = JSON.stringify({ message: "Error message" });
    const r = new Response(responseBody, { status: 400, statusText: 'Offline' });
    const userDescription = `Похоже, что вы не в сети. Рекомендуем перезагрузить страницу.`;
    const event = new CustomEvent('fish', { detail: {message: userDescription, type: "error"} });
    window.dispatchEvent(event);
    return r;
  }
}

async function makeFetch(url: string, params: RequestInit = {}, onSuccess: Function, onFail: Function, fishMessage: string, successMessage: boolean = false) {
  try {
    const r = await myfetch(url, params, fishMessage, successMessage);
    if (200 <= r.status && r.status < 300) {
      const responseText = await r.text();
      try {
        const d = JSON.parse(responseText);
        // console.log(`successfully fetched on ${url}\nresponse:`, d);
        onSuccess(d, r);
      } catch (error) {
        onSuccess();
        // console.error('Failed to parse JSON:', responseText);
        // throw error;
      }
    } else {
      throw new Error(`${r.status}`);
    }
  } catch (error) {
    onFail();
    const e = error as Error;
    if (e.message !== 'Unexpected end of JSON input') {
      console.error(`Failed to fetch on ${url}\nresponse status: ${e.message}`);
    }
  }
}


export { makeFetch };