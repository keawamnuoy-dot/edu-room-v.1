USE bookking_name;

ALTER TABLE users
    ADD COLUMN name_prefix VARCHAR(40) NOT NULL DEFAULT '' AFTER email,
    ADD COLUMN member_type ENUM('instructor', 'staff', 'student', 'external') NULL DEFAULT NULL AFTER name,
    ADD COLUMN profile_image MEDIUMTEXT NULL AFTER phone;
