chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "openGalileoForImage",
    title: "Open in Galileo",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openGalileoForImage") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: getImageDataUrl,
      args: [info.srcUrl],
    });
  }
});

function getImageDataUrl(srcUrl) {
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = function () {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const imageDataUrl = canvas.toDataURL("image/png");
    const pwaUrl = "http://localhost:5173/";

    const pwaWindow = window.open(pwaUrl, "_blank");
    setTimeout(() => pwaWindow.postMessage({ imageDataUrl }, pwaUrl), 250);
  };

  img.src = srcUrl;
}
