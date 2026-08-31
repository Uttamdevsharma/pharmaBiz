export interface SSLCommerzInitData {
  totalAmount: number;
  currency?: string;
  tranId: string;
  successUrl?: string;
  failUrl?: string;
  cancelUrl?: string;
  ipnUrl?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  customerCity?: string;
  customerCountry?: string;
  productName: string;
  productCategory?: string;
  valueA?: string; // tenantId
  valueB?: string; // planId or subscriptionId
  valueC?: string; // action type (e.g. SUBSCRIBE, RENEW, UPGRADE)
  valueD?: string;
}

export interface SSLCommerzInitResponse {
  status: string;
  failedreason?: string;
  sessionkey?: string;
  gw?: Record<string, string>;
  redirectGatewayURL?: string;
  DirectPaymentURL?: string;
  GatewayPageURL?: string;
}

export interface SSLCommerzValidationResponse {
  status: string;
  tran_date?: string;
  tran_id?: string;
  val_id?: string;
  amount?: string;
  store_amount?: string;
  currency?: string;
  bank_tran_id?: string;
  card_type?: string;
  card_no?: string;
  card_issuer?: string;
  card_brand?: string;
  card_sub_brand?: string;
  card_issuer_country?: string;
  currency_type?: string;
  currency_amount?: string;
  value_a?: string;
  value_b?: string;
  value_c?: string;
  value_d?: string;
  risk_level?: string;
  risk_title?: string;
  error?: string;
}

export class SSLCommerzService {
  private static get storeId(): string {
    return process.env.SSLCOMMERZ_STORE_ID || "testbox";
  }

  private static get storePassword(): string {
    return process.env.SSLCOMMERZ_STORE_PASSWORD || "qwerty";
  }

  private static get isSandbox(): boolean {
    return process.env.SSLCOMMERZ_IS_SANDBOX !== "false";
  }

  private static get baseUrl(): string {
    return this.isSandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
  }

  /**
   * Initiate SSLCOMMERZ Payment Session
   */
  static async initPayment(data: SSLCommerzInitData): Promise<SSLCommerzInitResponse> {
    const initUrl = `${this.baseUrl}/gwprocess/v4/api.php`;

    const formData = new URLSearchParams();
    formData.append("store_id", this.storeId);
    formData.append("store_passwd", this.storePassword);
    formData.append("total_amount", data.totalAmount.toFixed(2));
    formData.append("currency", data.currency || "BDT");
    formData.append("tran_id", data.tranId);
    formData.append("success_url", data.successUrl || process.env.SSLCOMMERZ_SUCCESS_URL || "http://localhost:3000/api/payments/sslcommerz/success");
    formData.append("fail_url", data.failUrl || process.env.SSLCOMMERZ_FAIL_URL || "http://localhost:3000/api/payments/sslcommerz/fail");
    formData.append("cancel_url", data.cancelUrl || process.env.SSLCOMMERZ_CANCEL_URL || "http://localhost:3000/api/payments/sslcommerz/cancel");
    formData.append("ipn_url", data.ipnUrl || process.env.SSLCOMMERZ_IPN_URL || "http://localhost:3000/api/payments/sslcommerz/ipn");
    
    // Customer Info
    formData.append("cus_name", data.customerName || "Customer");
    formData.append("cus_email", data.customerEmail || "customer@example.com");
    formData.append("cus_add1", data.customerAddress || "Dhaka, Bangladesh");
    formData.append("cus_city", data.customerCity || "Dhaka");
    formData.append("cus_country", data.customerCountry || "Bangladesh");
    formData.append("cus_phone", data.customerPhone || "01700000000");

    // Product Info
    formData.append("product_name", data.productName);
    formData.append("product_category", data.productCategory || "Subscription");
    formData.append("product_profile", "general");
    formData.append("shipping_method", "NO");
    formData.append("num_of_item", "1");

    // Custom tracking values
    if (data.valueA) formData.append("value_a", data.valueA);
    if (data.valueB) formData.append("value_b", data.valueB);
    if (data.valueC) formData.append("value_c", data.valueC);
    if (data.valueD) formData.append("value_d", data.valueD);

    const response = await fetch(initUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const result = await response.json();
    return result as SSLCommerzInitResponse;
  }

  /**
   * Validate SSLCOMMERZ Payment using val_id
   */
  static async validatePayment(valId: string): Promise<SSLCommerzValidationResponse> {
    const queryParams = new URLSearchParams({
      val_id: valId,
      store_id: this.storeId,
      store_passwd: this.storePassword,
      format: "json",
    });

    const validateUrl = `${this.baseUrl}/validator/api/validationserverAPI.php?${queryParams.toString()}`;

    const response = await fetch(validateUrl, {
      method: "GET",
    });

    const result = await response.json();
    return result as SSLCommerzValidationResponse;
  }

  /**
   * Query transaction by Merchant Transaction ID
   */
  static async queryTransaction(tranId: string): Promise<any> {
    const queryParams = new URLSearchParams({
      tran_id: tranId,
      store_id: this.storeId,
      store_passwd: this.storePassword,
      format: "json",
    });

    const queryUrl = `${this.baseUrl}/validator/api/merchantTransIDvalidationAPI.php?${queryParams.toString()}`;

    const response = await fetch(queryUrl, {
      method: "GET",
    });

    return await response.json();
  }
}
