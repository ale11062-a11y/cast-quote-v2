import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '../services/api';

interface VerticalCameraModalProps {
  companyId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoAdded: (photo: { url: string; width: number; height: number; caption: string }) => void;
}

export const VerticalCameraModal: React.FC<VerticalCameraModalProps> = ({
  companyId,
  isOpen,
  onClose,
  onPhotoAdded
}) => {
  const [mode, setMode] = useState<'camera' | 'file'>('camera');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<{ dataUrl: string; width: number; height: number } | null>(null);
  const [orientationError, setOrientationError] = useState<string | null>(null);
  const [isVideoVertical, setIsVideoVertical] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setOrientationError(null);
    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          aspectRatio: { ideal: 9 / 16 },
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.warn('Autoplay prevented:', e));
      }
    } catch (err: any) {
      console.warn('Unable to access camera:', err);
      setCameraError('Não foi possível acessar a câmera do dispositivo. Utilize a opção "Enviar Arquivo" abaixo.');
      setMode('file');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  // Monitor video stream dimensions to ensure vertical orientation
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const isVert = vw < vh;
      setIsVideoVertical(isVert);
      if (!isVert) {
        setOrientationError(
          `Câmera em modo horizontal (${vw}x${vh}px). Por favor, gire seu celular para a vertical (retrato) para habilitar a captura.`
        );
      } else {
        setOrientationError(null);
      }
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth;
    const height = video.videoHeight;

    // STRICT CHECK 1: Must be vertical
    if (width >= height) {
      setOrientationError(
        `FOTO REJEITADA! A imagem está na horizontal (${width}x${height}px). O padrão CAST Quote OBRIGA fotos em orientação VERTICAL (retrato). Por favor, segure o aparelho em pé.`
      );
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    stopCamera();
    setPreview({ dataUrl, width, height });
    setOrientationError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOrientationError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        // STRICT CHECK 2: File must be strictly vertical
        if (width >= height) {
          setOrientationError(
            `FOTO HORIZONTAL REJEITADA! A imagem enviada possui ${width}x${height}px (horizontal). O CAST Quote exige estritamente fotos VERTICAIS (retrato). Por favor, selecione ou capture uma foto vertical.`
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        // Accepted vertical photo
        setPreview({ dataUrl, width, height });
        setOrientationError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const confirmPhoto = async () => {
    if (!preview) return;

    // Final check before sending to server
    if (preview.width >= preview.height) {
      setOrientationError('Erro de orientação: a foto é horizontal e não pode ser salva.');
      return;
    }

    setUploading(true);
    try {
      const result = await api.uploadPhoto({
        image: preview.dataUrl,
        width: preview.width,
        height: preview.height,
        company_id: companyId,
        caption: caption.trim()
      });

      onPhotoAdded({
        url: result.url,
        width: result.width,
        height: result.height,
        caption: caption.trim()
      });

      handleClose();
    } catch (err: any) {
      setOrientationError(err.message || 'Erro ao enviar foto para o servidor');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setPreview(null);
    setCaption('');
    setOrientationError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Captura de Foto Vertical</h3>
              <p className="text-xs text-slate-400">Padrão CAST Quote: Apenas fotos em modo retrato (vertical)</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        {!preview && (
          <div className="flex border-b border-slate-800 bg-slate-900/50 p-1.5 gap-1.5">
            <button
              onClick={() => setMode('camera')}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Câmera do Dispositivo
            </button>
            <button
              onClick={() => {
                stopCamera();
                setMode('file');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                mode === 'file'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Enviar Arquivo
            </button>
          </div>
        )}

        {/* Orientation Error Alert */}
        {orientationError && (
          <div className="m-4 p-3.5 rounded-xl bg-red-950/90 border border-red-700/80 text-red-200 text-xs flex items-start gap-2.5 animate-shake">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-none mt-0.5" />
            <div>
              <strong className="block text-red-100 font-bold mb-0.5">Orientação Inválida</strong>
              <span>{orientationError}</span>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center min-h-[320px]">
          {preview ? (
            /* Preview of valid vertical photo */
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 shadow-xl max-h-[320px] aspect-[2/3] bg-black">
                <img
                  src={preview.dataUrl}
                  alt="Pré-visualização Vertical"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  VERTICAL VÁLIDA
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-slate-300 text-[10px] px-2 py-0.5 rounded">
                  {preview.width} x {preview.height} px
                </div>
              </div>

              <div className="w-full">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Legenda da Foto (aparecerá no PDF)
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex: Foto do painel elétrico principal..."
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="flex w-full gap-2">
                <button
                  onClick={() => {
                    setPreview(null);
                    if (mode === 'camera') startCamera();
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Tirar Outra
                </button>
                <button
                  onClick={confirmPhoto}
                  disabled={uploading}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {uploading ? 'Salvando...' : 'Adicionar Foto'}
                </button>
              </div>
            </div>
          ) : mode === 'camera' ? (
            /* Live Camera Stream */
            <div className="w-full flex flex-col items-center">
              {cameraError ? (
                <div className="text-center p-6 text-slate-400 text-sm">
                  <p className="mb-4">{cameraError}</p>
                  <button
                    onClick={() => setMode('file')}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    Selecionar do Arquivo
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative w-full max-w-[260px] aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-2xl flex items-center justify-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      className="w-full h-full object-cover"
                    />

                    {/* Portrait viewfinder guide */}
                    <div className="absolute inset-3 border-2 border-dashed border-white/50 rounded-xl pointer-events-none flex flex-col items-center justify-between p-2">
                      <span className="text-[10px] font-semibold text-white/80 bg-black/50 px-2 py-0.5 rounded">
                        QUADRO VERTICAL (2:3)
                      </span>
                      {!isVideoVertical && (
                        <div className="bg-red-600/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg text-center shadow-lg animate-pulse">
                          GIRE PARA A VERTICAL
                        </div>
                      )}
                      <span className="text-[9px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded">
                        CAST QUOTE
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col items-center gap-2">
                    <button
                      onClick={captureCameraPhoto}
                      disabled={!isVideoVertical}
                      className={`w-14 h-14 rounded-full border-4 border-white shadow-xl flex items-center justify-center transition active:scale-95 ${
                        isVideoVertical
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-50'
                      }`}
                      title={isVideoVertical ? 'Capturar Foto' : 'Gire o celular para a vertical'}
                    >
                      <div className="w-5 h-5 rounded-full bg-white" />
                    </button>
                    <span className="text-[11px] text-slate-400">
                      {isVideoVertical ? 'Toque para capturar' : 'Orientação horizontal bloqueada'}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* File Upload */
            <div className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
              />
              <div className="w-12 h-12 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">Selecione uma foto da galeria</p>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                <strong>ATENÇÃO:</strong> A imagem deve ser estritamente vertical (altura maior que largura). Fotos horizontais serão rejeitadas.
              </p>
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
              >
                Escolher Arquivo no Celular / PC
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
