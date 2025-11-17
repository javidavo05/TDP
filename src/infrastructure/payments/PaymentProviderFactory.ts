import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod } from "@/domain/types";
import { YappyComercialProvider } from "./yappy/YappyComercialProvider";
import { CashProvider } from "./cash/CashProvider";

export class PaymentProviderFactory {
  private static providers: Map<PaymentMethod, IPaymentProvider> = new Map();

  static getProvider(method: PaymentMethod): IPaymentProvider {
    if (this.providers.has(method)) {
      return this.providers.get(method)!;
    }

    let provider: IPaymentProvider;

    switch (method) {
      case "yappy":
        provider = new YappyComercialProvider();
        break;
      case "cash":
        provider = new CashProvider();
        break;
      // TODO: Add other providers (PagueloFacil, Tilopay, PayU, Banesco)
      default:
        throw new Error(`Payment provider not implemented for method: ${method}`);
    }

    this.providers.set(method, provider);
    return provider;
  }

  static getAllProviders(): IPaymentProvider[] {
    return [
      new YappyComercialProvider(),
      new CashProvider(),
      // TODO: Add other providers
    ];
  }
}

