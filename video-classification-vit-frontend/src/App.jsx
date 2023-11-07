  import React, { useEffect, useState } from 'react';
  import { InboxOutlined } from '@ant-design/icons';
  import { Button, Divider, message, Spin, Upload } from 'antd';
  import "./App.css"
  import axios from 'axios';
  const { Dragger } = Upload;
  const props = {
    name: 'file',
    multiple: false,
    action:"http://localhost:5000/upload",
  };
  function App() {
    const [selectedFile, setSelectedFile] = useState(false);
    const [stopped, setStopped] = useState(false);
    const [result, setResult] = useState(null);
    const [loadingResult, setLoadingResult] = useState(false);
    const [videoURL, setVideoURL] = useState(null);
    const [fileList, setFileList] = useState([]);
    const handleUpload = (info) => {
      const { status } = info.file;
      setFileList([info.file])
      const videoBlob = info.file.originFileObj;
      let videoObjectURL = URL.createObjectURL(videoBlob);
      console.log("videoURL",videoURL);
      console.log("videoObjectURL",videoObjectURL);
      if(videoBlob != null) {
        setSelectedFile(true);
        console.log("seleee");
      }
      if(videoURL == null && videoObjectURL != null && stopped == false ){
          setVideoURL(videoObjectURL);
      } 
      if(stopped == true) {
        setStopped(false)
      }
      setLoadingResult(true);
      if (status !== 'uploading') {
        console.log(info.file, info.fileList);
        // setVideoURL(null);
        setLoadingResult(false)
      }
      if (status === 'done') {
        setLoadingResult(false)
        message.success(`Đã dự đoán xong.`);
        const result = info.file.response; // Đảm bảo rằng máy chủ BE đã trả về resp với các thông tin bạn cần
        setResult(result);
        console.log(result);  
        setSelectedFile(false)
      } else if (status === 'error') {
        setLoadingResult(false)
        // setStopped(false);
        setResult(null)
        setFileList([])
        setSelectedFile(false)
        message.error(`Có lỗi không thể upload file`);
      }
    }
    const handleDrop = (e) => {
      // setLoadingResult(true)
      // console.log("sss");
      // console.log('Dropped files', e.dataTransfer.files);
    }
    const handleStop = () => {
      handleRemove();
      setStopped(true);
    }

    const handleRemove = () => {
      axios.get("http://localhost:5000/stop_prediction").then((resp) => {
        setResult(null);
        setVideoURL(null)
        setLoadingResult(false);  
        setFileList([]);
        setSelectedFile(false);
      }).catch((error) => {
        console.log(error);
      });
      }

    // Gọi API stop khi trang được tải lại
    useEffect(() => {
      window.addEventListener('beforeunload', () => {
        axios.get('http://localhost:5000/stop_prediction')
          .then((resp) => {
            console.log(resp);
          })
          .catch((error) => {
            console.log(error);
          });
      });

      return () => {
        window.removeEventListener('beforeunload', () => {});
      };
    }, []);
    return (
      <div className='wrapp' >
        <div className='wrapp-area-upload'>
          <div className='title'>
              <h2 className='title-inner'>Video classification - Vision Transformer</h2>
              <p className='description-title'>3 actions: soccer juggling, volleyball spiking, biking</p>
          </div>
        
            <div className='wrapp-dragger'>
            <Dragger fileList={fileList} maxCount={1} onRemove={handleRemove}
            {...props} className='area-upload' accept=".mp4" 
            disabled={selectedFile}
            onChange={handleUpload} onDrop={(e)=>console.log("ssa11",e)}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Click or drag file to this area to upload</p>
                  <p className="ant-upload-hint">
                    Upload a video file for prediction
                  </p>
            </Dragger>
            </div>
            {/* </div> */}
          
        </div>
      
    {videoURL && (
        <div className='wrapp-video'>
      
            {result == null && (
              <Button className='button-stop' onClick={handleStop}>Stop Prediction</Button>
            )}
            <Divider orientation="center" plain>
            Video
          </Divider>  
            <video controls autoPlay loop muted>
            {/*  */}
            <source  src={videoURL}  type="video/mp4"  />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
        <div className='wrapp-result'>
        {/* <Spin spinning={loadingResult} tip="loanding..." size="small"/> */}
          {loadingResult &&( 
            <span>Predicting...</span>
          )}
          {result && (  
            <div className='wrapp-result-inner'>
                  
              <h2>Result</h2>
              <p>Label:  {result.label} </p>
              <p>Probability: {result.percentage.toFixed(2)}%</p>
            </div>
          )}
        </div>
      </div>

    );  
  }

  export default App; 
