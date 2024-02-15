class apiResponse {
    constructor(data, message = 'Success', statusCode, success = true){
        this.statusCode = statusCode,
        this.success = success,
        this.message = message,
        this.data = data;
    }
}

export default apiResponse;