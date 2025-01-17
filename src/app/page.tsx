"use client"

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const Home = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-center mb-6">Chat with Your PDFs</h1>
        <PdfUpload />
      </div>
    </div>
  );
};

export default Home;

const PdfUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setResponseMessage(null); // Reset the message when new files are added
    },
  });

  const handleFileUpload = async () => {
    if (files.length === 0) {
      setResponseMessage("Please select at least one PDF file.");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("file", file));

    setIsProcessing(true);

    try {
      const response = await axios.post("/api/embed", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setIsProcessing(false);
      setResponseMessage(`Success: ${response.data.results}`);
    } catch (error: any) {
      setIsProcessing(false);
      setResponseMessage(`Error: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Upload PDF Files</h2>
      
      <div
        {...getRootProps()}
        className="border-2 border-dashed p-6 mb-4 text-center cursor-pointer"
      >
        <input {...getInputProps()} />
        <p>Drag & drop PDF files here, or click to select files</p>
      </div>

      <div>
        {files.length > 0 && (
          <div>
            <h3 className="font-medium">Selected Files:</h3>
            <ul className="list-disc pl-5">
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button
        onClick={handleFileUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded mt-4"
        disabled={isProcessing}
      >
        {isProcessing ? "Processing..." : "Upload and Process PDFs"}
      </button>

      {responseMessage && (
        <div
          className={`mt-4 p-4 rounded ${
            responseMessage.startsWith("Success") ? "bg-green-200" : "bg-red-200"
          }`}
        >
          <p>{responseMessage}</p>
        </div>
      )}
    </div>
  );
};

