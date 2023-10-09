from fastapi import FastAPI
from pydantic import BaseModel
from galileo import Galileo
from fastapi.middleware.cors import CORSMiddleware

galileo_editor = Galileo()


class SegmentRequest(BaseModel):
    image: str | None = None
    prompt: str | None = None


class SegmentResponse(BaseModel):
    masks: str


class GenerateRequest(BaseModel):
    image: str
    mask: str
    prompt: str
    style: str | None


class GenerateResponse(BaseModel):
    image: str


class SegmentPointRequest(BaseModel):
    x: int
    y: int


class SegmentPointResponse(BaseModel):
    mask: list[int]


class SetImageRequest(BaseModel):
    image: str


class SetImageResponse(BaseModel):
    success: bool


class EraseRequest(BaseModel):
    image: str
    mask: str


class EraseResponse(BaseModel):
    image: str


app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/segment")
async def segment(request: SegmentRequest) -> SegmentResponse:
    masks = galileo_editor.segment(request.image, request.prompt)
    return SegmentResponse(masks=masks)


@app.post("/generate")
async def generate(request: GenerateRequest) -> GenerateResponse:
    b64_image = galileo_editor.generate(
        request.image, request.mask, request.prompt, request.style
    )
    return GenerateResponse(image=b64_image)


@app.post("/erase")
async def erase(request: EraseRequest) -> EraseResponse:
    b64_image = galileo_editor.erase(request.image, request.mask)
    return EraseResponse(image=b64_image)


@app.post("/segment-point")
async def segment_point(request: SegmentPointRequest) -> SegmentPointResponse:
    mask = galileo_editor.segment_point(request.x, request.y)
    return SegmentPointResponse(mask=mask)


@app.post("/set-image")
async def set_image(request: SetImageRequest) -> SetImageResponse:
    galileo_editor.set_image(request.image)
    return SetImageResponse(success=True)
