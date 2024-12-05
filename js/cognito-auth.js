/*global WildRydes _config AmazonCognitoIdentity AWSCognito*/

var WildRydes = window.WildRydes || {};

(function scopeWrapper($) {
    var signinUrl = '/signin.html';

    var poolData = {
        UserPoolId: _config.cognito.userPoolId,
        ClientId: _config.cognito.userPoolClientId
    };

    var userPool;

    if (!(_config.cognito.userPoolId &&
          _config.cognito.userPoolClientId &&
          _config.cognito.region)) {
        $('#noCognitoMessage').show();
        return;
    }

    userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    if (typeof AWSCognito !== 'undefined') {
        AWSCognito.config.region = _config.cognito.region;
    }

    WildRydes.signOut = function signOut() {
        userPool.getCurrentUser().signOut();
    };

    WildRydes.authToken = new Promise(function fetchCurrentAuthToken(resolve, reject) {
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser) {
            cognitoUser.getSession(function sessionCallback(err, session) {
                if (err) {
                    reject(err);
                } else if (!session.isValid()) {
                    resolve(null);
                } else {
                    resolve(session.getIdToken().getJwtToken());
                }
            });
        } else {
            resolve(null);
        }
    });


    /*
     * Cognito User Pool functions
     */

    function register(email, password, role, onSuccess, onFailure) {
    var dataEmail = { Name: 'email', Value: email };
    var dataRole = { Name: 'custom:role', Value: role }; // 사용자 정의 속성 추가

    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
    var attributeRole = new AmazonCognitoIdentity.CognitoUserAttribute(dataRole);

    userPool.signUp(toUsername(email), password, [attributeEmail, attributeRole], null,
        function signUpCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        }
    );
}


    function signin(email, password, onSuccess, onFailure) {
        var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
            Username: toUsername(email),
            Password: password
        });

        var cognitoUser = createCognitoUser(email);
        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function authenticateSuccess(result) {
                console.log('Authentication successful');
                onSuccess(cognitoUser); // CognitoUser 객체를 반환
            },
            onFailure: onFailure
        });
    }


    function verify(email, code, onSuccess, onFailure) {
        createCognitoUser(email).confirmRegistration(code, true, function confirmCallback(err, result) {
            if (!err) {
                onSuccess(result);
            } else {
                onFailure(err);
            }
        });
    }

    function createCognitoUser(email) {
        return new AmazonCognitoIdentity.CognitoUser({
            Username: toUsername(email),
            Pool: userPool
        });
    }

    function toUsername(email) {
        return email.replace('@', '-at-');
    }

    /*
     *  Event Handlers
     */

    $(function onDocReady() {
        $('#signinForm').submit(handleSignin);
        $('#registrationForm').submit(handleRegister);
        $('#verifyForm').submit(handleVerify);
    });
    
    function handleSignin(event) {
        var email = $('#emailInputSignin').val();
        var password = $('#passwordInputSignin').val();
        var selectedRole = $('#roleInputSignin').val();
        var errorMessageDiv = $('#errorMessage'); // 오류 메시지를 보여줄 div
        event.preventDefault();
    
        // 역할(role) 선택 여부 확인
        if (!selectedRole) {
            errorMessageDiv.text('Please select a role (Admin or Student)').show();
            return;
        }
    
        // 로그인 시도
        signin(email, password,
            function signinSuccess(cognitoUser) {
                cognitoUser.getSession(function (err, session) {
                    if (err) {
                        console.error('Error getting session:', err);
                        errorMessageDiv.text('Failed to retrieve session: ' + err.message).show();
                        return;
                    }
    
                    // 세션이 유효하면 사용자 속성 가져오기
                    cognitoUser.getUserAttributes(function (err, attributes) {
                        if (err) {
                            console.error('Error fetching user attributes:', err);
                            errorMessageDiv.text('Failed to fetch user attributes: ' + err.message).show();
                            return;
                        }
    
                        // custom:role 속성 값 확인
                        var storedRole = null;
                        attributes.forEach(function (attribute) {
                            if (attribute.getName() === 'custom:role') {
                                storedRole = attribute.getValue();
                            }
                        });
    
                        // 선택된 역할과 저장된 역할 비교
                        if (storedRole === selectedRole) {
                            console.log('Role match. Login successful.');
                            // 역할에 따라 페이지 리디렉션
                            if (selectedRole === 'admin') {
                                window.location.href = 'admin.html'; // Admin 페이지로 이동
                            } else if (selectedRole === 'student') {
                                window.location.href = 'student.html'; // Student 페이지로 이동
                            }
                        } else {
                            console.error('Role mismatch. Access denied.');
                            errorMessageDiv.text('Role mismatch. Access denied.').show();
                        }
                    });
                });
            },
            function signinError(err) {
                console.error('Sign-in failed:', err);
                errorMessageDiv.text('Sign-in failed: ' + err.message).show();
            }
        );
    }
    
    
    

    function handleRegister(event) {
        var email = $('#emailInputRegister').val();
        var password = $('#passwordInputRegister').val();
        var password2 = $('#password2InputRegister').val();
        var role = $('#roleInputRegister').val(); // Role 값 가져오기
    
        var onSuccess = function registerSuccess(result) {
            var cognitoUser = result.user;
            console.log('user name is ' + cognitoUser.getUsername());
            var confirmation = ('Registration successful. Please check your email inbox or spam folder for your verification code.');
            if (confirmation) {
                window.location.href = 'verify.html';
            }
        };
    
        var onFailure = function registerFailure(err) {
            alert(err);
        };
    
        event.preventDefault();
    
        if (password === password2) {
            register(email, password, role, onSuccess, onFailure); // Role 전달
        } else {
            alert('Passwords do not match');
        }
    }
    

    function handleVerify(event) {
        var email = $('#emailInputVerify').val();
        var code = $('#codeInputVerify').val();
        event.preventDefault();
        verify(email, code,
            function verifySuccess(result) {
                console.log('call result: ' + result);
                console.log('Successfully verified');
                alert('Verification successful. You will now be redirected to the login page.');
                window.location.href = signinUrl;
            },
            function verifyError(err) {
                alert(err);
            }
        );
    }
}(jQuery));
