import { getYappySessionService } from "./YappySessionService";

export interface YappyError {
  code: string;
  description: string;
}

export interface YappyResponse<T> {
  body?: T;
  status: {
    code: string;
    description: string;
  };
}

/**
 * Cliente HTTP para la API de Yappy Comercial
 * Maneja autenticación, headers y errores según el swagger
 */
export class YappyAPIClient {
  private baseUrl: string;
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.baseUrl = process.env.YAPPY_BASE_URL || "https://api.yappy.com.pa";
    this.apiKey = process.env.YAPPY_API_KEY || "";
    this.secretKey = process.env.YAPPY_SECRET_KEY || "";
  }

  /**
   * Obtiene los headers necesarios para las peticiones a Yappy
   */
  private async getHeaders(includeAuth: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "API Key": this.apiKey,
      "Secret Key": this.secretKey,
    };

    if (includeAuth) {
      const sessionService = getYappySessionService();
      const token = await sessionService.getSessionToken();
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Maneja errores de la API según códigos YP-*
   */
  private handleError(response: Response, data?: any): Error {
    const errorCode = data?.status?.code || "YP-9999";
    const errorMessage = data?.status?.description || response.statusText;

    // Mapear códigos de error comunes
    const errorMessages: Record<string, string> = {
      "YP-0000": "Operación exitosa",
      "YP-0001": "No se encontraron datos relacionados con la búsqueda",
      "YP-0002": "Error al procesar los datos. Contacte al administrador",
      "YP-0006": "Error al procesar los datos. Contacte al administrador",
      "YP-0008": "Cabeceras obligatorias faltantes en la petición",
      "YP-0010": "Uno o más campos del cuerpo de la petición no cumplen con los valores enumerados",
      "YP-0039": "La cantidad de alias excede el máximo permitido",
      "YP-0040": "El límite de consulta está fuera del rango permitido",
      "YP-9999": "Error, el servicio ha tardado en responder",
    };

    const friendlyMessage = errorMessages[errorCode] || errorMessage;

    return new Error(`Yappy API Error (${errorCode}): ${friendlyMessage}`);
  }

  /**
   * Realiza una petición GET a la API de Yappy
   */
  async get<T>(endpoint: string, includeAuth: boolean = true): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders(includeAuth);

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw this.handleError(response, data);
    }

    if (data.status?.code !== "YP-0000") {
      throw this.handleError(response, data);
    }

    return data.body || data;
  }

  /**
   * Realiza una petición POST a la API de Yappy
   */
  async post<T>(endpoint: string, body: any, includeAuth: boolean = true): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders(includeAuth);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw this.handleError(response, data);
    }

    if (data.status?.code !== "YP-0000") {
      throw this.handleError(response, data);
    }

    return data.body || data;
  }

  /**
   * Realiza una petición PUT a la API de Yappy
   */
  async put<T>(endpoint: string, body?: any, includeAuth: boolean = true): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = await this.getHeaders(includeAuth);

    const response = await fetch(url, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw this.handleError(response, data);
    }

    if (data.status?.code !== "YP-0000") {
      throw this.handleError(response, data);
    }

    return data.body || data;
  }
}

// Singleton instance
let apiClientInstance: YappyAPIClient | null = null;

export function getYappyAPIClient(): YappyAPIClient {
  if (!apiClientInstance) {
    apiClientInstance = new YappyAPIClient();
  }
  return apiClientInstance;
}

