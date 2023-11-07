from flask import Flask, request, jsonify
import cv2
import torch
from tqdm import tqdm
from PIL import Image
from transformers import ViTImageProcessor, ViTForImageClassification
import os
import pickle
from flask_cors import CORS
import sys
app = Flask(__name__)
CORS(app)
stop_processing = False  # Khởi tạo biến dừng

def predict_video(video_path, model_path, frame_rate=15):
    # Khởi tạo processor
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print("GPU is available")
    else:
        device = torch.device("cpu")
        print("GPU is not available, using CPU")

    with open('id2label.pkl', 'rb') as file:
        id2label = pickle.load(file)

    with open('label2id.pkl', 'rb') as file:
        label2id = pickle.load(file)
    # Hàm dự đoán video
    processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")

    # Tải mô hình ViT đã được huấn luyện
    model = ViTForImageClassification.from_pretrained(model_path)
    # Mở video
    cap = cv2.VideoCapture(video_path)
    frame_count = 0

    # Khởi tạo danh sách để lưu trữ các frame tạm thời
    frames = []

    while cap is not None:
        ret, frame = cap.read()
        if stop_processing:  # Kiểm tra biến dừng
            break  # Thoát khỏi vòng lặp nếu biến dừng là True
        if not ret:
            break

        # Tính toán số frame cần giữ lại dựa trên frame rate
        if frame_count % int(30 / frame_rate) == 0:
            # Chuyển frame thành ảnh PIL
            frame_pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            # Thêm ảnh vào danh sách frames
            frames.append(frame_pil)

        frame_count += 1

    # Đóng video
    cap.release()

    # Khởi tạo danh sách dự đoán cho từng class
    class_predictions = {label: 0.0 for label in id2label.values()}

    # Lặp qua các frame và dự đoán phân loại
    for frame in tqdm(frames, desc="Predicting"):
        # Chuẩn bị dữ liệu
        if stop_processing:  # Kiểm tra biến dừng
            break  # Thoát khỏi vòng lặp nếu biến dừng là True
        inputs = processor(images=frame, return_tensors="pt")

        # Thực hiện dự đoán
        with torch.no_grad():
            outputs = model(**inputs)

        # Trích xuất kết quả dự đoán
        logits = outputs.logits
        predicted_probabilities = torch.softmax(logits, dim=1)

        # Cộng tỷ lệ phần trăm vào danh sách dự đoán cho từng class
        for label, id in label2id.items():
            class_predictions[label] += predicted_probabilities[0][id].item() * 100

    # Tổng tỷ lệ phần trăm dự đoán cho toàn bộ video
    total_percentage = sum(class_predictions.values())

    # Tìm class với tỷ lệ phần trăm lớn nhất
    final_label = max(class_predictions, key=class_predictions.get)
    final_percentage = class_predictions[final_label]
    final_normalized_percentage = (final_percentage / total_percentage) * 100

    return {
        "label": final_label,
        "percentage": final_normalized_percentage,
    }

@app.route('/upload', methods=['POST'])
def upload_video():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"})
    global stop_processing
    print("Run")
    stop_processing = False
    video_file = request.files['file']

    if video_file.filename == '':
        return jsonify({"error": "No file selected"})

    # Lưu video tạm thời và đường dẫn của nó
    temp_video_path = "temp_video.mp4"
    video_file.save(temp_video_path)

    # Gọi hàm predict_video với đường dẫn video và mô hình đã cho
    result = predict_video(temp_video_path, model_path, frame_rate)

    # Xóa video tạm thời
    os.remove(temp_video_path)

    return jsonify(result)
@app.route('/stop_prediction', methods=['GET'])
def stop_prediction():
    global stop_processing
    print("Stop")
    stop_processing = True  # Đặt biến dừng thành True
    return jsonify({"message": "Processing stopped"})

if __name__ == '__main__':
    # Thay thế model_path và frame_rate bằng giá trị thực tế
    model_path = "phungtuhieu/vit_finetuning01"
    frame_rate = 30
    app.run(debug=True)



