import { IPaymentProvider } from "@/domain/interfaces";
import { PaymentMethod } from "@/domain/types";
import { YappyComercialProvider } from "./yappy/YappyComercialProvider";
import { CashProvider } from "./cash/CashProvider";
import { PagueloFacilProvider } from "./paguelofacil/PagueloFacilProvider";
import { TilopayProvider } from "./tilopay/TilopayProvider";
import { PayUProvider } from "./payu/PayUProvider";
import { BanescoProvider } from "./banesco/BanescoProvider";
import { CardProvider } from "./card/CardProvider";

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
      case "paguelofacil":
        provider = new PagueloFacilProvider();
        break;
      case "tilopay":
        provider = new TilopayProvider();
        break;
      case "payu":
        provider = new PayUProvider();
        break;
      case "banesco":
        provider = new BanescoProvider();
        break;
      case "card":
        provider = new CardProvider();
        break;
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
      new PagueloFacilProvider(),
      new TilopayProvider(),
      new PayUProvider(),
      new BanescoProvider(),
      new CardProvider(),
    ];
  }
}

