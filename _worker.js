import { v4 as uuidv4 } from 'uuid';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return url.pathname.startsWith('/image/')
      ? handleImageRequest(request, env)
      : handleProxyRequest(request, env);
  }
};

async function handleImageRequest(request, env) {
  const url = new URL(request.url);
  const fileName = url.pathname.split('/').pop();
  
  try {
    const object = await env.BUCKET.get(fileName);
    if (object === null) {
      return new Response("Image not found", { status: 404 });
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Error retrieving image:", error);
    return new Response("Server error", { status: 500 });
  }
}

async function handleProxyRequest(request, env) {
  const url = new URL(request.url);
  const imageUrl = ensureProtocol(decodeURIComponent(url.pathname.slice(1)));
  
  try {
    const response = await fetchImage(imageUrl);
    const contentType = response.headers.get("Content-Type");
    validateImageContentType(contentType);
    
    const arrayBuffer = await response.arrayBuffer();
    const uniqueFileName = generateUniqueFileName(imageUrl);
    
    await saveImageToBucket(env, uniqueFileName, arrayBuffer, contentType);
    
    const newImageUrl = `${url.origin}/image/${uniqueFileName}`;
    return new Response(JSON.stringify({ url: newImageUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling proxy request:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

function ensureProtocol(url) {
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : 'https://' + url;
}

async function fetchImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }
  return response;
}

function validateImageContentType(contentType) {
  if (!contentType || !contentType.startsWith("image/")) {
    throw new Error("Invalid image content type");
  }
}

function generateUniqueFileName(imageUrl) {
  const timestamp = Date.now();
  const uuid = uuidv4();
  const originalFileName = imageUrl.split("/").pop();
  const fileExtension = originalFileName.split('.').pop();
  return `${timestamp}-${uuid}.${fileExtension}`;
}

async function saveImageToBucket(env, fileName, arrayBuffer, contentType) {
  await env.BUCKET.put(fileName, arrayBuffer, {
    contentType: contentType,
  });
}
