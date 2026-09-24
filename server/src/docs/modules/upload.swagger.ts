export const uploadSwagger = {
  paths: {
    "/api/upload/image": {
      post: {
        tags: ["Uploads"],
        summary: "Upload image or regulatory document",
        description: "Uploads prescription image, trade license, drug license, or company logo to Cloudinary or local disk.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Image or PDF file (up to 25MB)",
                  },
                  image: {
                    type: "string",
                    format: "binary",
                    description: "Alternative alias field for file",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        url: { type: "string", example: "https://res.cloudinary.com/pharmabiz/image/upload/v1/license.jpg" },
                        publicId: { type: "string", example: "pharmabiz/licenses/license_01" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "No file uploaded or file format invalid" },
        },
      },
      delete: {
        tags: ["Uploads"],
        summary: "Delete uploaded image by public ID or URL",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  publicId: { type: "string", example: "pharmabiz/licenses/license_01" },
                  url: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Image deleted" } },
      },
    },
  },
};
