/* eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

export const updateSettings = async (data, type) => {
    try {
        const res = await axios({
            method: 'PATCH',
            url:
                type === 'data'
                    ? 'http://127.0.0.1:1337/api/v1/users/updateMe'
                    : 'http://127.0.0.1:1337/api/v1/users/updatePassword',
            data
        });

        if (res.data.status === 'success') {
            showAlert('success', `${type} updated successfully!`);
        }
    } catch (err) {
        showAlert('error', err.response.data.message);
    }
};
