"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import {
  ClipboardList,
  FileAudio,
  KeyRound,
  Mic,
  MessageSquare,
  RotateCcw,
  Square,
} from "lucide-react";
import ChatInput from "@/components/ui/user-promt";
import MessagesView from "@/components/ui/messages-view";
import { Button } from "@/components/ui/button";

const LOCAL_BACKEND_API_URL = "http://localhost:8000";
const SERVER_BACKEND_API_URL = "https://iplvr.it.ntnu.no/backend";
type BackendTarget = "local" | "server";
type TestMode = "chat" | "voice" | "progress";
const PANEL_CLASS = "rounded-lg border bg-white p-4 shadow-sm";
const ENDPOINT_CLASS = "rounded-md border bg-gray-50 px-3 py-2 font-mono text-xs";
const VELOCIRAPTOR_GIF =
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGRvNDJiN2c1Nm95bmloa3Q5dHc0aDVhZG5yNXEzdGppa2FxZjVjbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/YkoIN5YLQymQfFaPwO/giphy.gif";

const encodeWav = (buffers: Float32Array[], sampleRate: number) => {
  const length = buffers.reduce((total, buffer) => total + buffer.length, 0);
  const wavBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  buffers.forEach((buffer) => {
    buffer.forEach((sample) => {
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(
        offset,
        clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff,
        true
      );
      offset += 2;
    });
  });

  return new Blob([wavBuffer], { type: "audio/wav" });
};

interface Role {
  name: string;
  description: string;
  document_access: string[];
  function_access?: string[];
}

interface ExternalAgentInfo {
  agent_id: string;
  name: string;
  roles: Role[];
}

interface ContextUsed {
  document_name: string;
  category: string;
  chunk_index: number;
  content: string;
}

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  contextUsed?: ContextUsed[];
  functionCalls?: FunctionCall[];
}

interface FunctionCall {
  name: string;
  arguments: Record<string, unknown>;
}

const extractJsonObject = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  const startIndex = trimmed.indexOf("{");
  if (startIndex === -1) return null;

  let inString = false;
  let escapeNext = false;
  let depth = 0;

  for (let index = startIndex; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === "\\") {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(trimmed.slice(startIndex, index + 1));
          return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
};

const normalizeAssistantPayload = (
  message: unknown,
  functionCalls: unknown
): { message: string; functionCalls: FunctionCall[] } => {
  const normalizedFunctionCalls = Array.isArray(functionCalls)
    ? (functionCalls as FunctionCall[])
    : [];
  if (typeof message !== "string") {
    return { message: "", functionCalls: normalizedFunctionCalls };
  }

  const parsed = extractJsonObject(message);
  if (!parsed || typeof parsed.message !== "string") {
    return { message, functionCalls: normalizedFunctionCalls };
  }

  return {
    message: parsed.message,
    functionCalls:
      normalizedFunctionCalls.length > 0 && Array.isArray(functionCalls)
        ? normalizedFunctionCalls
        : Array.isArray(parsed.functions)
          ? (parsed.functions as FunctionCall[])
          : [],
  };
};

interface ProgressStep {
  step_name: string;
  repetition_number: number;
  completed: boolean;
}

interface ProgressSubtask {
  subtask_name: string;
  description: string;
  completed: boolean;
  step_progress: ProgressStep[];
}

interface ProgressData {
  task_name: string;
  description: string;
  status: string;
  agent_id?: string;
  access_key?: string;
  session_id?: string;
  user_id?: string;
  subtask_progress: ProgressSubtask[];
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
}

interface APIError {
  title: string;
  message: string;
}

interface ProgressSessionResponse {
  agent_id: string;
  session_id: string;
  expires_after_hours: number;
}

export default function ExternalChatPage() {
  const [accessKey, setAccessKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [agentInfo, setAgentInfo] = useState<ExternalAgentInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [apiError, setApiError] = useState<APIError | null>(null);
  const [backendTarget, setBackendTarget] = useState<BackendTarget>("local");
  const [testMode, setTestMode] = useState<TestMode>("chat");
  const [sessionId, setSessionId] = useState("");
  const [userInformation, setUserInformation] = useState("");
  const [userActions, setUserActions] = useState("");
  const [progressEntries, setProgressEntries] = useState<ProgressData[]>([]);
  const [progressTaskName, setProgressTaskName] = useState("Unity test task");
  const [progressDescription, setProgressDescription] = useState(
    "Task progress sent by the external application."
  );
  const [progressStatus, setProgressStatus] = useState("started");
  const [progressResult, setProgressResult] = useState("");
  const [isTestingProgress, setIsTestingProgress] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioLanguage, setAudioLanguage] = useState("");
  const [voiceResult, setVoiceResult] = useState("");
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVelociraptor, setShowVelociraptor] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordingBuffersRef = useRef<Float32Array[]>([]);
  const recordingSampleRateRef = useRef(44100);

  const normalizedRoleName = roleName.trim();
  const historyStorageKey = useMemo(() => {
    if (!agentInfo || !normalizedRoleName) return null;
    return `ragdoll_external_chat_${agentInfo.agent_id}_${normalizedRoleName}`;
  }, [agentInfo, normalizedRoleName]);
  const sessionStorageKey = useMemo(() => {
    if (!agentInfo || !accessKey.trim()) return null;
    return `ragdoll_external_session_${backendTarget}_${agentInfo.agent_id}_${accessKey.trim()}`;
  }, [accessKey, agentInfo, backendTarget]);
  const activeBackendUrl =
    backendTarget === "local" ? LOCAL_BACKEND_API_URL : SERVER_BACKEND_API_URL;

  const splitLines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const buildCommandPayload = (chatLog: ChatMessage[]) => ({
    agent_id: agentInfo?.agent_id,
    active_role_id: normalizedRoleName,
    access_key: accessKey.trim(),
    chat_log: chatLog,
    user_information: splitLines(userInformation),
    user_actions: splitLines(userActions),
    progress: progressEntries,
    session_id: sessionId,
    progress_limit: 5,
  });

  const formatResult = (value: unknown) => JSON.stringify(value, null, 2);

  const runFunctionCalls = (functionCalls: FunctionCall[]) => {
    functionCalls.forEach((functionCall) => {
      if (functionCall.name === "velociraptor") {
        setShowVelociraptor(true);
        window.setTimeout(() => setShowVelociraptor(false), 3000);
      }
    });
  };

  const requestProgressSession = useCallback(async (agentId: string) => {
    const response = await axios.get<ProgressSessionResponse>(
      `${activeBackendUrl}/api/progress/session`,
      {
        params: { agent_id: agentId },
        headers: { "access-key": accessKey.trim() },
      }
    );
    return response.data.session_id;
  }, [accessKey, activeBackendUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedTarget = window.localStorage.getItem(
      "ragdoll_external_backend_target"
    );
    if (storedTarget === "local" || storedTarget === "server") {
      setBackendTarget(storedTarget);
      return;
    }

    setBackendTarget(
      window.location.hostname === "localhost" ? "local" : "server"
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("ragdoll_external_backend_target", backendTarget);
  }, [backendTarget]);

  useEffect(() => {
    if (!historyStorageKey || typeof window === "undefined") return;

    try {
      const storedHistory = window.localStorage.getItem(historyStorageKey);
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setMessages(parsed as ChatMessage[]);
          return;
        }
      }
    } catch (error) {
      console.warn("Failed to parse stored external chat history", error);
    }

    setMessages([
      {
        role: "agent",
        content: `Hello! I'm ${normalizedRoleName}. How can I help you?`,
      },
    ]);
  }, [historyStorageKey, normalizedRoleName]);

  useEffect(() => {
    if (!historyStorageKey || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(historyStorageKey, JSON.stringify(messages));
    } catch (error) {
      console.warn("Failed to persist external chat history", error);
    }
  }, [historyStorageKey, messages]);

  useEffect(() => {
    if (!sessionStorageKey || typeof window === "undefined") return;

    const storedSessionId = window.localStorage.getItem(sessionStorageKey);
    if (storedSessionId) {
      setSessionId(storedSessionId);
      return;
    }

    if (!agentInfo) return;

    let cancelled = false;
    requestProgressSession(agentInfo.agent_id)
      .then((nextSessionId) => {
        if (cancelled) return;
        window.localStorage.setItem(sessionStorageKey, nextSessionId);
        setSessionId(nextSessionId);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiError({
          title: "Session Error",
          message: axios.isAxiosError(error)
            ? error.response?.data?.detail ||
              "Unable to create a backend progress session."
            : "Unable to create a backend progress session.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [agentInfo, requestProgressSession, sessionStorageKey]);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      processorNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      audioContextRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [recordedAudioUrl]);

  const replaceAudioFile = (file: File) => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
    }
    setAudioFile(file);
    setRecordedAudioUrl(URL.createObjectURL(file));
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError("Microphone recording is not available in this browser.");
      return;
    }

    setRecordingError("");
    setVoiceResult("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContextConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const mutedOutput = audioContext.createGain();
      mutedOutput.gain.value = 0;

      recordingBuffersRef.current = [];
      recordingSampleRateRef.current = audioContext.sampleRate;
      processor.onaudioprocess = (event) => {
        const channelData = event.inputBuffer.getChannelData(0);
        recordingBuffersRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(mutedOutput);
      mutedOutput.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      processorNodeRef.current = processor;
      setIsRecording(true);
    } catch (error) {
      setRecordingError(
        error instanceof Error
          ? error.message
          : "Unable to access the microphone."
      );
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleStopRecording = () => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    const blob = encodeWav(
      recordingBuffersRef.current,
      recordingSampleRateRef.current
    );
    const recordedFile = new File([blob], "microphone-recording.wav", {
      type: "audio/wav",
    });
    replaceAudioFile(recordedFile);

    processorNodeRef.current = null;
    sourceNodeRef.current = null;
    audioContextRef.current = null;
    mediaStreamRef.current = null;
    recordingBuffersRef.current = [];
    setIsRecording(false);
  };

  const handleConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyForRequest = accessKey.trim();
    const roleForRequest = roleName.trim();

    if (!keyForRequest || !roleForRequest) {
      setApiError({
        title: "Missing Details",
        message: "Enter both an access key and role.",
      });
      return;
    }

    setIsConnecting(true);
    setApiError(null);

    try {
      const response = await axios.get<ExternalAgentInfo>(
        `${activeBackendUrl}/agent-info-by-accesskey`,
        {
          headers: {
            "access-key": keyForRequest,
          },
        }
      );

      const resolvedAgent = response.data;
      const matchingRole = resolvedAgent.roles.find(
        (role) => role.name === roleForRequest
      );

      if (!matchingRole) {
        const availableRoles =
          resolvedAgent.roles.map((role) => role.name).join(", ") || "none";
        setApiError({
          title: "Role Not Found",
          message: `Role '${roleForRequest}' is not configured for this agent. Available roles: ${availableRoles}`,
        });
        setAgentInfo(null);
        return;
      }

      setAgentInfo(resolvedAgent);
    } catch (error) {
      setAgentInfo(null);
      setApiError({
        title: "Access Denied",
        message: `${
          axios.isAxiosError(error)
            ? error.response?.data?.detail ||
              error.response?.data?.message ||
              "The access key is invalid or expired."
            : "The access key is invalid or expired."
        } Backend: ${activeBackendUrl}`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSendPrompt = (prompt: string) => {
    if (!prompt.trim() || !agentInfo || !normalizedRoleName) return;

    const userMessage: ChatMessage = { role: "user", content: prompt };
    const chatLogForRequest = [...messages, userMessage];
    setMessages(chatLogForRequest);
    setIsAwaitingResponse(true);

    axios
      .post(`${activeBackendUrl}/api/chat/ask`, buildCommandPayload(chatLogForRequest))
      .then((response) => {
        const normalizedResponse = normalizeAssistantPayload(
          response.data.response.response,
          response.data.response.function_calls
        );
        const contextUsed = response.data.response.context_used;
        const functionCalls = normalizedResponse.functionCalls;
        runFunctionCalls(functionCalls);
        setMessages((previousMessages) => [
          ...previousMessages,
          {
            role: "agent",
            content: normalizedResponse.message,
            contextUsed: contextUsed || [],
            functionCalls,
          },
        ]);
      })
      .catch((error) => {
        setApiError({
          title: "Communication Error",
          message: axios.isAxiosError(error)
            ? error.response?.data?.message ||
              error.response?.data?.detail ||
              "Unable to communicate with the agent."
            : "Unable to communicate with the agent.",
        });
        setMessages((previousMessages) => [
          ...previousMessages,
          { role: "agent", content: "Error communicating with agent" },
        ]);
      })
      .finally(() => setIsAwaitingResponse(false));
  };

  const handleTranscribeOnly = async () => {
    if (!audioFile) return;

    setIsTestingVoice(true);
    setVoiceResult("");
    setApiError(null);

    const formData = new FormData();
    formData.append("audio", audioFile);
    if (audioLanguage.trim()) {
      formData.append("language", audioLanguage.trim());
    }

    try {
      const response = await axios.post(
        `${activeBackendUrl}/api/chat/transcribe`,
        formData
      );
      setVoiceResult(formatResult(response.data));
    } catch (error) {
      setApiError({
        title: "Transcription Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.error ||
            error.response?.data?.detail ||
            "Unable to transcribe the audio file."
          : "Unable to transcribe the audio file.",
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleVoiceAsk = async () => {
    if (!audioFile || !agentInfo || !normalizedRoleName) return;

    setIsTestingVoice(true);
    setVoiceResult("");
    setApiError(null);

    const formData = new FormData();
    formData.append("audio", audioFile);
    formData.append("data", JSON.stringify(buildCommandPayload(messages)));

    try {
      const response = await axios.post(
        `${activeBackendUrl}/api/chat/askTranscribe`,
        formData
      );
      setVoiceResult(formatResult(response.data));

      const transcription = response.data.transcription;
      const normalizedResponse = normalizeAssistantPayload(
        response.data.response?.response,
        response.data.response?.function_calls
      );
      const contextUsed = response.data.response?.context_used || [];
      const functionCalls = normalizedResponse.functionCalls;
      runFunctionCalls(functionCalls);
      if (transcription) {
        setMessages((previousMessages) => [
          ...previousMessages,
          { role: "user", content: transcription },
          {
            role: "agent",
            content:
              normalizedResponse.message || "No agent response returned.",
            contextUsed,
            functionCalls,
          },
        ]);
      }
    } catch (error) {
      setApiError({
        title: "Voice Ask Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unable to ask the agent with audio."
          : "Unable to ask the agent with audio.",
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  const buildProgressPayload = (): ProgressData => ({
    agent_id: agentInfo?.agent_id,
    access_key: accessKey.trim(),
    session_id: sessionId,
    task_name: progressTaskName.trim() || "Unity test task",
    description: progressDescription.trim(),
    status: progressStatus,
    subtask_progress: [
      {
        subtask_name: "External endpoint test",
        description: "Generated from the RAGdollChat external test page.",
        completed: progressStatus === "complete",
        step_progress: [
          {
            step_name: "Send request",
            repetition_number: 0,
            completed: true,
          },
        ],
      },
    ],
  });

  const handleInitializeProgress = async () => {
    if (!agentInfo) return;
    setIsTestingProgress(true);
    setProgressResult("");
    setApiError(null);

    try {
      const response = await axios.post(
        `${activeBackendUrl}/api/progress/initializeTasks`,
        {
          agent_id: agentInfo.agent_id,
          access_key: accessKey.trim(),
          session_id: sessionId,
          items: [buildProgressPayload()],
        }
      );
      setProgressResult(formatResult(response.data));
    } catch (error) {
      setApiError({
        title: "Progress Init Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.detail || "Unable to initialize progress."
          : "Unable to initialize progress.",
      });
    } finally {
      setIsTestingProgress(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!agentInfo) return;
    setIsTestingProgress(true);
    setProgressResult("");
    setApiError(null);

    try {
      const response = await axios.post(
        `${activeBackendUrl}/api/progress/updateTask`,
        buildProgressPayload()
      );
      setProgressResult(formatResult(response.data));
    } catch (error) {
      setApiError({
        title: "Progress Update Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.detail || "Unable to update progress."
          : "Unable to update progress.",
      });
    } finally {
      setIsTestingProgress(false);
    }
  };

  const handleFetchProgress = async () => {
    if (!agentInfo) return;
    setIsTestingProgress(true);
    setProgressResult("");
    setApiError(null);

    try {
      const response = await axios.get<ProgressData[]>(
        `${activeBackendUrl}/api/progress`,
        {
          params: { agent_id: agentInfo.agent_id, session_id: sessionId, limit: 20 },
          headers: { "access-key": accessKey.trim() },
        }
      );
      setProgressEntries(response.data);
      setProgressResult(formatResult(response.data));
    } catch (error) {
      setApiError({
        title: "Progress Fetch Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.detail || "Unable to fetch progress."
          : "Unable to fetch progress.",
      });
    } finally {
      setIsTestingProgress(false);
    }
  };

  const handleReset = () => {
    processorNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    setAgentInfo(null);
    setMessages([]);
    setApiError(null);
    setProgressEntries([]);
    setProgressResult("");
    setVoiceResult("");
    setRecordingError("");
    setIsRecording(false);
  };

  const handleBackendTargetChange = (target: BackendTarget) => {
    setBackendTarget(target);
    setAgentInfo(null);
    setMessages([]);
    setApiError(null);
  };

  const handleClearHistory = () => {
    if (!normalizedRoleName) return;
    setMessages([
      {
        role: "agent",
        content: `Hello! I'm ${normalizedRoleName}. How can I help you?`,
      },
    ]);
  };

  const handleNewSession = async () => {
    if (!agentInfo) return;

    try {
      const nextSessionId = await requestProgressSession(agentInfo.agent_id);
      if (sessionStorageKey && typeof window !== "undefined") {
        window.localStorage.setItem(sessionStorageKey, nextSessionId);
      }
      setSessionId(nextSessionId);
      setProgressEntries([]);
      setProgressResult("");
      handleClearHistory();
    } catch (error) {
      setApiError({
        title: "Session Error",
        message: axios.isAxiosError(error)
          ? error.response?.data?.detail ||
            "Unable to create a backend progress session."
          : "Unable to create a backend progress session.",
      });
    }
  };

  if (!agentInfo) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-6">
          <form
            onSubmit={handleConnect}
            className="w-full space-y-5 rounded-lg border bg-white p-6 shadow-sm"
          >
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">External Agent Chat</h1>
              <p className="text-muted-foreground text-sm">
                Use an agent access key and role to start a session.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Backend</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={backendTarget === "local" ? "default" : "outline"}
                  onClick={() => handleBackendTargetChange("local")}
                >
                  Localhost
                </Button>
                <Button
                  type="button"
                  variant={backendTarget === "server" ? "default" : "outline"}
                  onClick={() => handleBackendTargetChange("server")}
                >
                  Server
                </Button>
              </div>
              <div className="text-muted-foreground break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-xs">
                {activeBackendUrl}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Access key</span>
              <input
                value={accessKey}
                onChange={(event) => setAccessKey(event.target.value)}
                className="border-input focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Role</span>
              <input
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                className="border-input focus-visible:ring-ring min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                autoComplete="off"
                spellCheck={false}
              />
            </label>

            {apiError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <div className="font-medium">{apiError.title}</div>
                <div>{apiError.message}</div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isConnecting || !accessKey.trim() || !roleName.trim()}
            >
              <KeyRound className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Start chat"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="fixed inset-x-0 top-0 z-40 border-b bg-white">
        <div className="flex min-h-14 flex-wrap items-center gap-2 px-4 py-2">
          <span className="text-sm font-medium">{agentInfo.name}</span>
          <span className="text-muted-foreground text-sm">
            Role: {normalizedRoleName}
          </span>
          <span className="text-muted-foreground hidden break-all font-mono text-xs md:inline">
            {activeBackendUrl}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearHistory}
              disabled={isAwaitingResponse}
            >
              Clear history
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isAwaitingResponse}
            >
              <RotateCcw className="h-4 w-4" />
              Change key
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-h-screen pt-14 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="relative flex h-[calc(100vh-3.5rem)] min-h-[560px] flex-col items-center pb-24">
          <MessagesView
            isLoading={isAwaitingResponse}
            messages={messages}
            agentName={agentInfo.name}
          />
          <ChatInput
            disabled={isAwaitingResponse}
            onSend={handleSendPrompt}
            containerClassName="fixed inset-x-4 bottom-0 z-50 lg:right-[420px]"
          />
        </section>

        <aside className="h-auto border-t bg-gray-50 p-4 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:border-t-0 lg:border-l">
          <div className="space-y-4">
            <div className={PANEL_CLASS}>
              <h2 className="text-lg font-semibold">Endpoint Tests</h2>
              <p className="text-muted-foreground text-sm">
                Calls use the selected backend, access key, agent, and role.
              </p>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-muted-foreground">Agent</span>
                  <div className="font-medium">{agentInfo.name}</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <span className="text-muted-foreground">Backend</span>
                  <div className="break-all font-mono">{activeBackendUrl}</div>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Session</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleNewSession}
                    >
                      New
                    </Button>
                  </div>
                  <div className="mt-1 break-all font-mono">
                    {sessionId || "Creating session..."}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border bg-white p-1 shadow-sm">
              <Button
                type="button"
                variant={testMode === "chat" ? "default" : "outline"}
                onClick={() => setTestMode("chat")}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </Button>
              <Button
                type="button"
                variant={testMode === "voice" ? "default" : "outline"}
                onClick={() => setTestMode("voice")}
              >
                <Mic className="h-4 w-4" />
                Voice
              </Button>
              <Button
                type="button"
                variant={testMode === "progress" ? "default" : "outline"}
                onClick={() => setTestMode("progress")}
              >
                <ClipboardList className="h-4 w-4" />
                Progress
              </Button>
            </div>

            {testMode === "chat" && (
              <div className={`${PANEL_CLASS} space-y-4`}>
                <div className={ENDPOINT_CLASS}>
                  POST /api/chat/ask
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">User/game information</span>
                  <textarea
                    value={userInformation}
                    onChange={(event) => setUserInformation(event.target.value)}
                    className="border-input min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    placeholder="One fact per line"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Recent user/game actions</span>
                  <textarea
                    value={userActions}
                    onChange={(event) => setUserActions(event.target.value)}
                    className="border-input min-h-24 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    placeholder="One action per line"
                  />
                </label>
                <div className="text-muted-foreground text-sm">
                  Use the chat box to send the request. The backend automatically includes the 5 most recent progress tasks for this session.
                </div>
              </div>
            )}

            {testMode === "voice" && (
              <div className={`${PANEL_CLASS} space-y-4`}>
                <div className="space-y-1">
                  <div className={ENDPOINT_CLASS}>
                    POST /api/chat/transcribe
                  </div>
                  <div className={ENDPOINT_CLASS}>
                    POST /api/chat/askTranscribe
                  </div>
                </div>
                <div className="rounded-md border bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Mic className="h-4 w-4" />
                    Microphone
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={isRecording ? "secondary" : "outline"}
                      onClick={handleStartRecording}
                      disabled={isRecording || isTestingVoice}
                    >
                      <Mic className="h-4 w-4" />
                      Record
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleStopRecording}
                      disabled={!isRecording}
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  </div>
                  {isRecording && (
                    <div className="mt-2 text-sm text-red-700">
                      Recording from microphone...
                    </div>
                  )}
                  {recordingError && (
                    <div className="mt-2 text-sm text-red-700">
                      {recordingError}
                    </div>
                  )}
                </div>
                <label className="block space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <FileAudio className="h-4 w-4" />
                    Audio file
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(event) => {
                      const selectedFile = event.target.files?.[0];
                      if (selectedFile) {
                        replaceAudioFile(selectedFile);
                      }
                    }}
                    className="w-full text-sm"
                  />
                </label>
                {audioFile && (
                  <div className="space-y-2 rounded-md border bg-gray-50 p-3">
                    <div className="text-sm font-medium">{audioFile.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {Math.max(1, Math.round(audioFile.size / 1024))} KB
                    </div>
                    {recordedAudioUrl && (
                      <audio controls src={recordedAudioUrl} className="w-full" />
                    )}
                  </div>
                )}
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Language</span>
                  <input
                    value={audioLanguage}
                    onChange={(event) => setAudioLanguage(event.target.value)}
                    className="border-input min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                    placeholder="Optional, e.g. en or no"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTranscribeOnly}
                    disabled={!audioFile || isTestingVoice}
                  >
                    Transcribe
                  </Button>
                  <Button
                    type="button"
                    onClick={handleVoiceAsk}
                    disabled={!audioFile || isTestingVoice}
                  >
                    Ask agent
                  </Button>
                </div>
                {voiceResult && (
                  <pre className="max-h-72 overflow-auto rounded-md border bg-gray-950 p-3 text-xs text-white">
                    {voiceResult}
                  </pre>
                )}
                <div className="text-muted-foreground text-sm">
                  The backend currently supports speech-to-text only. There is no text-to-speech endpoint for voice output.
                </div>
              </div>
            )}

            {testMode === "progress" && (
              <div className={`${PANEL_CLASS} space-y-4`}>
                <div className="space-y-1">
                  <div className={ENDPOINT_CLASS}>
                    POST /api/progress/initializeTasks
                  </div>
                  <div className={ENDPOINT_CLASS}>
                    POST /api/progress/updateTask
                  </div>
                  <div className={ENDPOINT_CLASS}>
                    GET /api/progress
                  </div>
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Task name</span>
                  <input
                    value={progressTaskName}
                    onChange={(event) => setProgressTaskName(event.target.value)}
                    className="border-input min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Description</span>
                  <textarea
                    value={progressDescription}
                    onChange={(event) => setProgressDescription(event.target.value)}
                    className="border-input min-h-20 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Status</span>
                  <select
                    value={progressStatus}
                    onChange={(event) => setProgressStatus(event.target.value)}
                    className="border-input min-h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                  >
                    <option value="pending">pending</option>
                    <option value="started">started</option>
                    <option value="complete">complete</option>
                  </select>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleInitializeProgress}
                    disabled={isTestingProgress}
                  >
                    Init
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUpdateProgress}
                    disabled={isTestingProgress}
                  >
                    Update
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFetchProgress}
                    disabled={isTestingProgress}
                  >
                    Fetch
                  </Button>
                </div>
                <div className="text-muted-foreground text-sm">
                  Progress is stored in backend memory for this session. Fetched tasks are shown here for debugging; chat can load recent session progress automatically.
                </div>
                {progressResult && (
                  <pre className="max-h-72 overflow-auto rounded-md border bg-gray-950 p-3 text-xs text-white">
                    {progressResult}
                  </pre>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {apiError && (
        <div className="fixed right-4 bottom-24 z-50 max-w-md rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          <div className="font-medium">{apiError.title}</div>
          <div>{apiError.message}</div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setApiError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
      {showVelociraptor && (
        <div className="pointer-events-none fixed inset-0 z-[80] bg-black/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={VELOCIRAPTOR_GIF}
            alt="Velociraptor"
            className="h-screen w-screen object-cover"
          />
        </div>
      )}
    </main>
  );
}
