const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.updateParkingSpacesTree = functions.firestore.document('ParkingSensors/{sensorId}').onUpdate((change, context) => {
    const newValue = change.after.data();
    const prevValue = change.before.data();

    const newStatus = newValue.status;
    const prevStatus = prevValue.status;

    const path = newValue.path;

    console.log('New Status:' + newStatus);
    console.log('Prev Status:' + prevStatus);
    console.log('path:' + path);

    const nodes = path.split('/');

    var promises = [];

    var p = "";
    var paths = [];
    for (var i in nodes) {
        var node = nodes[i];
        if (node === 'ParkingLevels' || node === 'ParkingSlots') {
            promises.push(admin.firestore()
                .doc(p)
                .get());
            paths.push(p);
            console.log("add node:" + p);
        }
        if (node.length > 0)
            p = p + "/" + node;
    }

    promises.push(admin.firestore()
                .doc(path)
                .get());

    paths.push(path);

    return Promise.all(promises).then(snapshots => {
        var finalPromises = [];
        for (var i = 0; i < snapshots.length; i++) {
            var result = snapshots[i];
            if (!result.exists) {
                console.log('No such document!');
            } else {
                console.log('Document data:', result.data());

                var values = result.data();
                var { available4WSlots, reserved4WSlots, total4WSlots } = values;
                
                if (!available4WSlots) {
                    available4WSlots = 0;
                }

                if (!reserved4WSlots) {
                    reserved4WSlots = 0;
                }

                if (!total4WSlots) {
                    total4WSlots = 0;
                }

                const p = paths[i];

                if (prevStatus === 0 && newStatus === 1) {
                    available4WSlots--;
                } else if (prevStatus === 1 && newStatus === 0) {
                    available4WSlots++;
                } else if (prevStatus === 0 && newStatus === 2) {
                    available4WSlots--;
                    total4WSlots--;
                    reserved4WSlots++;
                } else if (prevStatus === 2 && newStatus === 0) {
                    available4WSlots++;
                    total4WSlots++;
                    reserved4WSlots--;
                } else if (prevStatus === 2 && newStatus === 1) {
                    total4WSlots++;
                    reserved4WSlots--;
                }

                if (p === path) {
                    finalPromises.push(admin.firestore()
                    .doc(p)
                    .set(
                        Object.assign(values, {status: newStatus})
                    )
                    .then(res => {
                        console.log('successfully updated');
                        return 1;
                    })
                    .catch(e => {
                        console.log('failed to update');
                        return 0;
                    }));
                } else {
                    finalPromises.push(admin.firestore()
                    .doc(p)
                    .set(
                        Object.assign(values, {available4WSlots, reserved4WSlots, total4WSlots})
                    )
                    .then(res => {
                        console.log('successfully updated');
                        return 1;
                    })
                    .catch(e => {
                        console.log('failed to update');
                        return 0;
                    }));
                }
            }
        }

        return Promise.all(finalPromises);
    });
})