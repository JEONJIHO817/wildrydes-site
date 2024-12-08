/*global WildRydes _config*/

var WildRydes = window.WildRydes || {};
WildRydes.admin = WildRydes.admin || {};

// Fingerprint Modal Elements
const fingerprintModal = new bootstrap.Modal(document.getElementById('fingerprintModal'));
const fingerprintForm = document.getElementById('fingerprintForm');

// 출근부 조회 버튼 클릭 이벤트
document.getElementById('viewAllAttendanceBtn').onclick = function () {
    console.log('Redirecting to attendance page...');
    window.location.href = '/adminAttendance.html'; // 출근부 조회 페이지로 리디렉션
};

/* global _config */
(function adminPortalScopeWrapper($) {
    let authToken;

    // AWS Cognito 인증 토큰 설정
    WildRydes.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        } else {
            window.location.href = '/signin.html';
        }
    }).catch(function handleTokenError(error) {
        console.error('Error retrieving auth token: ', error);
        window.location.href = '/signin.html';
    });

    // 지문 등록 버튼 클릭 이벤트
    $('#registerFingerprintBtn').on('click', function () {
        $('#fingerprintModal').modal('show'); // 모달 표시
    });

    // 지문 등록 폼 제출 이벤트
    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]); // Base64만 추출
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file);
        });
    };
    
    $('#fingerprintForm').on('submit', async function (event) {
        event.preventDefault();
    
        const studentId = $('#studentId').val();
        const file1 = $('#fingerprintFile1')[0].files[0];
        const file2 = $('#fingerprintFile2')[0].files[0];
        const file3 = $('#fingerprintFile3')[0].files[0];
    
        if (!studentId || !file1 || !file2 || !file3) {
            alert('모든 필드를 입력하고 파일을 업로드하세요.');
            return;
        }
    
        try {
            const fingerprintFile1 = await convertFileToBase64(file1);
            const fingerprintFile2 = await convertFileToBase64(file2);
            const fingerprintFile3 = await convertFileToBase64(file3);
    
            const payload = {
                studentId,
                fingerprintFile1,
                fingerprintFile2,
                fingerprintFile3,
            };
    
            $.ajax({
                method: 'POST',
                url: _config.api.invokeUrl + '/admin/registerFingerprint',
                headers: {
                    Authorization: authToken,
                },
                contentType: 'application/json',
                data: JSON.stringify(payload), // JSON 형태로 전송
                success: function () {
                    alert('Fingerprint registered successfully!');
                    $('#fingerprintModal').modal('hide');
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    console.error('Error registering fingerprint: ', textStatus, errorThrown);
                    alert('Error occurred during fingerprint registration.');
                },
            });
        } catch (error) {
            console.error('Error processing files:', error);
            alert('파일 처리 중 오류가 발생했습니다.');
        }
    });
})(jQuery);

