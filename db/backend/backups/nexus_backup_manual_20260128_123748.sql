--
-- PostgreSQL database dump
--

\restrict igKUWrd7hZc9ldtjQv1N7lrv82sBUr59LdGtEfirRHolUFWOYAz2UPgqRjgXsES

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 17.7 (Debian 17.7-0+deb13u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: approvalstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approvalstatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: notificationtype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notificationtype AS ENUM (
    'TRAVELER_CREATED',
    'TRAVELER_UPDATED',
    'TRAVELER_DELETED',
    'LABOR_ENTRY_CREATED',
    'LABOR_ENTRY_UPDATED',
    'LABOR_ENTRY_DELETED',
    'TRACKING_ENTRY_CREATED',
    'TRACKING_ENTRY_UPDATED',
    'TRACKING_ENTRY_DELETED'
);


--
-- Name: priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);


--
-- Name: travelerstatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.travelerstatus AS ENUM (
    'DRAFT',
    'CREATED',
    'IN_PROGRESS',
    'COMPLETED',
    'ON_HOLD',
    'CANCELLED',
    'ARCHIVED'
);


--
-- Name: travelertype; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.travelertype AS ENUM (
    'PCB',
    'ASSY',
    'CABLE',
    'CABLE_ASSY',
    'MECHANICAL',
    'TEST'
);


--
-- Name: userrole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.userrole AS ENUM (
    'ADMIN',
    'OPERATOR'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    requested_by integer NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    status public.approvalstatus,
    approved_by integer,
    approved_at timestamp with time zone,
    rejected_by integer,
    rejected_at timestamp with time zone,
    rejection_reason text,
    request_type character varying(20) NOT NULL,
    request_details text NOT NULL
);


--
-- Name: approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approvals_id_seq OWNED BY public.approvals.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    field_changed character varying(50),
    old_value text,
    new_value text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent character varying(500)
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: labor_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.labor_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer,
    work_center character varying(100),
    sequence_number integer,
    employee_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    description text,
    is_completed boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: labor_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.labor_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: labor_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.labor_entries_id_seq OWNED BY public.labor_entries.id;


--
-- Name: manual_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    description text NOT NULL,
    added_by integer NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: manual_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.manual_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: manual_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.manual_steps_id_seq OWNED BY public.manual_steps.id;


--
-- Name: nexus_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_approvals (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    requested_by integer NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    status public.approvalstatus,
    approved_by integer,
    approved_at timestamp with time zone,
    rejected_by integer,
    rejected_at timestamp with time zone,
    rejection_reason text,
    request_type character varying(20) NOT NULL,
    request_details text NOT NULL
);


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_approvals_id_seq OWNED BY public.nexus_approvals.id;


--
-- Name: nexus_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_audit_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(20) NOT NULL,
    field_changed character varying(50),
    old_value text,
    new_value text,
    "timestamp" timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent character varying(500)
);


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_audit_logs_id_seq OWNED BY public.nexus_audit_logs.id;


--
-- Name: nexus_labor_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_labor_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer,
    work_center character varying(100),
    sequence_number integer,
    employee_id integer NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    description text,
    is_completed boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_labor_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_labor_entries_id_seq OWNED BY public.nexus_labor_entries.id;


--
-- Name: nexus_manual_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_manual_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    description text NOT NULL,
    added_by integer NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_manual_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_manual_steps_id_seq OWNED BY public.nexus_manual_steps.id;


--
-- Name: nexus_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type public.notificationtype NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    reference_id integer,
    reference_type character varying(50),
    created_by_username character varying(100),
    is_read boolean,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_notifications_id_seq OWNED BY public.nexus_notifications.id;


--
-- Name: nexus_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_parts (
    id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_parts_id_seq OWNED BY public.nexus_parts.id;


--
-- Name: nexus_process_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_process_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_number integer NOT NULL,
    operation character varying(100) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    instructions text NOT NULL,
    quantity integer,
    accepted integer,
    rejected integer,
    sign character varying(50),
    completed_date character varying(20),
    estimated_time integer,
    is_required boolean,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_process_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_process_steps_id_seq OWNED BY public.nexus_process_steps.id;


--
-- Name: nexus_step_scan_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_step_scan_events (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer NOT NULL,
    step_type character varying(20) NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    scan_action character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by integer,
    notes text,
    duration_minutes double precision
);


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_step_scan_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_step_scan_events_id_seq OWNED BY public.nexus_step_scan_events.id;


--
-- Name: nexus_sub_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_sub_steps (
    id integer NOT NULL,
    process_step_id integer NOT NULL,
    step_number character varying(10) NOT NULL,
    description text NOT NULL,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_sub_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_sub_steps_id_seq OWNED BY public.nexus_sub_steps.id;


--
-- Name: nexus_traveler_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_traveler_time_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    operator_name character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    pause_duration double precision,
    is_completed boolean,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_traveler_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_traveler_time_entries_id_seq OWNED BY public.nexus_traveler_time_entries.id;


--
-- Name: nexus_traveler_tracking_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_traveler_tracking_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100),
    step_sequence integer,
    scan_type character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by character varying(100),
    notes text
);


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_traveler_tracking_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_traveler_tracking_logs_id_seq OWNED BY public.nexus_traveler_tracking_logs.id;


--
-- Name: nexus_travelers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_travelers (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50),
    po_number character varying(255),
    traveler_type public.travelertype NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    priority public.priority,
    work_center character varying(20) NOT NULL,
    status public.travelerstatus,
    is_active boolean,
    notes text,
    specs text,
    specs_date character varying(20),
    from_stock character varying(100),
    to_stock character varying(100),
    ship_via character varying(100),
    comments text,
    due_date character varying(20),
    ship_date character varying(20),
    include_labor_hours boolean,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    completed_at timestamp with time zone,
    part_id integer
);


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_travelers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_travelers_id_seq OWNED BY public.nexus_travelers.id;


--
-- Name: nexus_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    is_approver boolean,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: nexus_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_users_id_seq OWNED BY public.nexus_users.id;


--
-- Name: nexus_work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_work_centers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_work_centers_id_seq OWNED BY public.nexus_work_centers.id;


--
-- Name: nexus_work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_work_orders (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50) NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    work_center character varying(20) NOT NULL,
    priority public.priority,
    process_template text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nexus_work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nexus_work_orders_id_seq OWNED BY public.nexus_work_orders.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type public.notificationtype NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    reference_id integer,
    reference_type character varying(50),
    created_by_username character varying(100),
    is_read boolean,
    created_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parts (
    id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.parts_id_seq OWNED BY public.parts.id;


--
-- Name: process_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_steps (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_number integer NOT NULL,
    operation character varying(100) NOT NULL,
    work_center_code character varying(20) NOT NULL,
    instructions text NOT NULL,
    quantity integer,
    accepted integer,
    rejected integer,
    sign character varying(50),
    completed_date character varying(20),
    estimated_time integer,
    is_required boolean,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: process_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.process_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: process_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.process_steps_id_seq OWNED BY public.process_steps.id;


--
-- Name: step_scan_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_scan_events (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    step_id integer NOT NULL,
    step_type character varying(20) NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    scan_action character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by integer,
    notes text,
    duration_minutes double precision
);


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_scan_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_scan_events_id_seq OWNED BY public.step_scan_events.id;


--
-- Name: sub_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_steps (
    id integer NOT NULL,
    process_step_id integer NOT NULL,
    step_number character varying(10) NOT NULL,
    description text NOT NULL,
    is_completed boolean,
    completed_by integer,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sub_steps_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sub_steps_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sub_steps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sub_steps_id_seq OWNED BY public.sub_steps.id;


--
-- Name: traveler_time_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveler_time_entries (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100) NOT NULL,
    operator_name character varying(100) NOT NULL,
    start_time timestamp with time zone NOT NULL,
    pause_time timestamp with time zone,
    end_time timestamp with time zone,
    hours_worked double precision,
    pause_duration double precision,
    is_completed boolean,
    created_by integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traveler_time_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traveler_time_entries_id_seq OWNED BY public.traveler_time_entries.id;


--
-- Name: traveler_tracking_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.traveler_tracking_logs (
    id integer NOT NULL,
    traveler_id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_center character varying(100),
    step_sequence integer,
    scan_type character varying(20) NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    scanned_by character varying(100),
    notes text
);


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.traveler_tracking_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.traveler_tracking_logs_id_seq OWNED BY public.traveler_tracking_logs.id;


--
-- Name: travelers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.travelers (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50),
    po_number character varying(255),
    traveler_type public.travelertype NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    priority public.priority,
    work_center character varying(20) NOT NULL,
    status public.travelerstatus,
    is_active boolean,
    notes text,
    specs text,
    specs_date character varying(20),
    from_stock character varying(100),
    to_stock character varying(100),
    ship_via character varying(100),
    comments text,
    due_date character varying(20),
    ship_date character varying(20),
    include_labor_hours boolean,
    created_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    completed_at timestamp with time zone,
    part_id integer
);


--
-- Name: travelers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.travelers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: travelers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.travelers_id_seq OWNED BY public.travelers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    role public.userrole NOT NULL,
    is_approver boolean,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_centers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    code character varying(20) NOT NULL,
    description text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_centers_id_seq OWNED BY public.work_centers.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    job_number character varying(50) NOT NULL,
    work_order_number character varying(50) NOT NULL,
    part_number character varying(50) NOT NULL,
    part_description character varying(200) NOT NULL,
    revision character varying(20) NOT NULL,
    quantity integer NOT NULL,
    customer_code character varying(20),
    customer_name character varying(100),
    work_center character varying(20) NOT NULL,
    priority public.priority,
    process_template text,
    is_active boolean,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals ALTER COLUMN id SET DEFAULT nextval('public.approvals_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: labor_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries ALTER COLUMN id SET DEFAULT nextval('public.labor_entries_id_seq'::regclass);


--
-- Name: manual_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps ALTER COLUMN id SET DEFAULT nextval('public.manual_steps_id_seq'::regclass);


--
-- Name: nexus_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals ALTER COLUMN id SET DEFAULT nextval('public.nexus_approvals_id_seq'::regclass);


--
-- Name: nexus_audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs ALTER COLUMN id SET DEFAULT nextval('public.nexus_audit_logs_id_seq'::regclass);


--
-- Name: nexus_labor_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries ALTER COLUMN id SET DEFAULT nextval('public.nexus_labor_entries_id_seq'::regclass);


--
-- Name: nexus_manual_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_manual_steps_id_seq'::regclass);


--
-- Name: nexus_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications ALTER COLUMN id SET DEFAULT nextval('public.nexus_notifications_id_seq'::regclass);


--
-- Name: nexus_parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_parts ALTER COLUMN id SET DEFAULT nextval('public.nexus_parts_id_seq'::regclass);


--
-- Name: nexus_process_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_process_steps_id_seq'::regclass);


--
-- Name: nexus_step_scan_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events ALTER COLUMN id SET DEFAULT nextval('public.nexus_step_scan_events_id_seq'::regclass);


--
-- Name: nexus_sub_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps ALTER COLUMN id SET DEFAULT nextval('public.nexus_sub_steps_id_seq'::regclass);


--
-- Name: nexus_traveler_time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries ALTER COLUMN id SET DEFAULT nextval('public.nexus_traveler_time_entries_id_seq'::regclass);


--
-- Name: nexus_traveler_tracking_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs ALTER COLUMN id SET DEFAULT nextval('public.nexus_traveler_tracking_logs_id_seq'::regclass);


--
-- Name: nexus_travelers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers ALTER COLUMN id SET DEFAULT nextval('public.nexus_travelers_id_seq'::regclass);


--
-- Name: nexus_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_users ALTER COLUMN id SET DEFAULT nextval('public.nexus_users_id_seq'::regclass);


--
-- Name: nexus_work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers ALTER COLUMN id SET DEFAULT nextval('public.nexus_work_centers_id_seq'::regclass);


--
-- Name: nexus_work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_orders ALTER COLUMN id SET DEFAULT nextval('public.nexus_work_orders_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts ALTER COLUMN id SET DEFAULT nextval('public.parts_id_seq'::regclass);


--
-- Name: process_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps ALTER COLUMN id SET DEFAULT nextval('public.process_steps_id_seq'::regclass);


--
-- Name: step_scan_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events ALTER COLUMN id SET DEFAULT nextval('public.step_scan_events_id_seq'::regclass);


--
-- Name: sub_steps id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps ALTER COLUMN id SET DEFAULT nextval('public.sub_steps_id_seq'::regclass);


--
-- Name: traveler_time_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries ALTER COLUMN id SET DEFAULT nextval('public.traveler_time_entries_id_seq'::regclass);


--
-- Name: traveler_tracking_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs ALTER COLUMN id SET DEFAULT nextval('public.traveler_tracking_logs_id_seq'::regclass);


--
-- Name: travelers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers ALTER COLUMN id SET DEFAULT nextval('public.travelers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers ALTER COLUMN id SET DEFAULT nextval('public.work_centers_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.approvals (id, traveler_id, requested_by, requested_at, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, request_type, request_details) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, traveler_id, user_id, action, field_changed, old_value, new_value, "timestamp", ip_address, user_agent) FROM stdin;
1	14	4	CREATED	\N	\N	\N	2026-01-15 16:51:19.375651+00	127.0.0.1	NEXUS-Frontend
2	14	4	UPDATED	\N	\N	\N	2026-01-15 17:28:50.884459+00	127.0.0.1	NEXUS-Frontend
3	14	4	UPDATED	\N	\N	\N	2026-01-15 17:29:14.218418+00	127.0.0.1	NEXUS-Frontend
4	14	4	UPDATED	\N	\N	\N	2026-01-15 17:33:55.021592+00	127.0.0.1	NEXUS-Frontend
5	14	4	UPDATED	\N	\N	\N	2026-01-15 17:51:56.646946+00	127.0.0.1	NEXUS-Frontend
6	14	4	UPDATED	\N	\N	\N	2026-01-15 17:52:14.005852+00	127.0.0.1	NEXUS-Frontend
7	14	4	UPDATED	\N	\N	\N	2026-01-15 17:55:14.782823+00	127.0.0.1	NEXUS-Frontend
8	14	4	UPDATED	\N	\N	\N	2026-01-15 18:04:56.296775+00	127.0.0.1	NEXUS-Frontend
9	15	4	CREATED	\N	\N	\N	2026-01-27 19:10:48.281333+00	192.168.1.64	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
10	15	4	UPDATED	\N	\N	\N	2026-01-28 12:23:56.580286+00	192.168.1.64	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
11	16	4	CREATED	\N	\N	\N	2026-01-28 12:37:48.499+00	192.168.1.64	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36
\.


--
-- Data for Name: labor_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.labor_entries (id, traveler_id, step_id, work_center, sequence_number, employee_id, start_time, pause_time, end_time, hours_worked, description, is_completed, created_at) FROM stdin;
1	15	\N	ENGINEERING	1	4	2026-01-27 12:00:00+00	\N	2026-01-27 12:30:00+00	0.5	ENGINEERING - ADAM	f	2026-01-27 19:12:20.646602+00
2	15	\N	WASH	6	4	2026-01-27 12:15:00+00	\N	2026-01-27 12:51:00+00	0.6	WASH - J5	f	2026-01-27 19:15:42.012486+00
3	15	\N	WASH	6	4	2026-01-27 14:00:00+00	\N	2026-01-27 19:06:00+00	5.1	WASH - PREET	f	2026-01-27 19:16:48.694922+00
4	15	\N	AOI	10	4	2026-01-27 16:00:00+00	\N	2026-01-27 05:04:00+00	-10.93	AOI - Kanav	f	2026-01-28 12:04:29.879608+00
5	15	\N	AOI	10	4	2026-01-27 15:11:00+00	\N	2026-01-27 16:12:00+00	1.02	AOI - Kanav	t	2026-01-28 12:12:09.138731+00
6	15	\N	AOI	10	4	2026-01-28 15:12:00+00	\N	2026-01-28 15:45:00+00	0.55	AOI - Preet	t	2026-01-28 12:12:41.010769+00
\.


--
-- Data for Name: manual_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.manual_steps (id, traveler_id, description, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: nexus_approvals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_approvals (id, traveler_id, requested_by, requested_at, status, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, request_type, request_details) FROM stdin;
\.


--
-- Data for Name: nexus_audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_audit_logs (id, traveler_id, user_id, action, field_changed, old_value, new_value, "timestamp", ip_address, user_agent) FROM stdin;
\.


--
-- Data for Name: nexus_labor_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_labor_entries (id, traveler_id, step_id, work_center, sequence_number, employee_id, start_time, pause_time, end_time, hours_worked, description, is_completed, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_manual_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_manual_steps (id, traveler_id, description, added_by, added_at) FROM stdin;
\.


--
-- Data for Name: nexus_notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_notifications (id, user_id, notification_type, title, message, reference_id, reference_type, created_by_username, is_read, created_at, read_at) FROM stdin;
\.


--
-- Data for Name: nexus_parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_parts (id, part_number, description, revision, work_center_code, customer_code, customer_name, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_process_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_process_steps (id, traveler_id, step_number, operation, work_center_code, instructions, quantity, accepted, rejected, sign, completed_date, estimated_time, is_required, is_completed, completed_by, completed_at, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_step_scan_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_step_scan_events (id, traveler_id, step_id, step_type, job_number, work_center, scan_action, scanned_at, scanned_by, notes, duration_minutes) FROM stdin;
\.


--
-- Data for Name: nexus_sub_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_sub_steps (id, process_step_id, step_number, description, is_completed, completed_by, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_traveler_time_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_traveler_time_entries (id, traveler_id, job_number, work_center, operator_name, start_time, pause_time, end_time, hours_worked, pause_duration, is_completed, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_traveler_tracking_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_traveler_tracking_logs (id, traveler_id, job_number, work_center, step_sequence, scan_type, scanned_at, scanned_by, notes) FROM stdin;
\.


--
-- Data for Name: nexus_travelers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_travelers (id, job_number, work_order_number, po_number, traveler_type, part_number, part_description, revision, quantity, customer_code, customer_name, priority, work_center, status, is_active, notes, specs, specs_date, from_stock, to_stock, ship_via, comments, due_date, ship_date, include_labor_hours, created_by, created_at, updated_at, completed_at, part_id) FROM stdin;
\.


--
-- Data for Name: nexus_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_users (id, username, email, first_name, last_name, hashed_password, role, is_approver, is_active, created_at, updated_at) FROM stdin;
1	adam	adam@nexus.local	Adam		$2b$12$sAtLrWth2UZ7m0EPWlEArOPfCtpfHGrSeYxxjPwrHDnyPi6A/ez.i	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
2	kris	kris@nexus.local	Kris		$2b$12$ichlTN8LXJzfB/gwIIaHhuxb9gMxIdY4Q9kkQYcjtSt9vWbTgTOti	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
3	alex	alex@nexus.local	Alex		$2b$12$pCl.REJPBjwdibAL5CBe/OaOdxPS31JzkJcirt71QpBL6bk7ThlZq	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
4	preet	preet@nexus.local	Preet		$2b$12$6W1x1UPVM7T8XFShP/9kHe5NgzqWaUIsVbnKmla5V/y2LsBbQCtg6	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
5	kanav	kanav@nexus.local	Kanav		$2b$12$WH8xCU277jAUsz1PvBRZ7u/YpEyIUTPjMbQF4h9Mkm6M3ITnEfSHW	ADMIN	t	t	2026-01-13 13:14:22.260051+00	\N
\.


--
-- Data for Name: nexus_work_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_work_centers (id, name, code, description, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: nexus_work_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nexus_work_orders (id, job_number, work_order_number, part_number, part_description, revision, quantity, customer_code, customer_name, work_center, priority, process_template, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, notification_type, title, message, reference_id, reference_type, created_by_username, is_read, created_at, read_at) FROM stdin;
1	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
3	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
5	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
6	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
7	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	6	traveler	preet	f	2026-01-15 12:33:55.311458+00	\N
8	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
10	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
12	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
13	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
14	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-001 - 4-Layer PCB Assembly	4	traveler	preet	f	2026-01-15 12:45:58.207076+00	\N
15	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
17	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
19	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
20	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
21	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-002 - Cable Assembly - 24 AWG	5	traveler	preet	f	2026-01-15 12:46:01.708839+00	\N
22	1	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
24	3	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
26	5	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
27	6	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
28	7	TRAVELER_DELETED	Traveler Deleted	preet deleted traveler JOB-2026-003 - Functional Test Fixture	7	traveler	preet	f	2026-01-15 12:46:05.07946+00	\N
29	1	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
31	3	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
33	5	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
34	6	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
35	7	TRAVELER_CREATED	New Traveler Created	preet created traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 16:51:19.602491+00	\N
36	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:28:50.898617+00	\N
38	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:28:50.898617+00	\N
39	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:28:50.898617+00	\N
40	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:28:50.898617+00	\N
41	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:28:50.898617+00	\N
43	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:29:14.23303+00	\N
45	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:29:14.23303+00	\N
46	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:29:14.23303+00	\N
47	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:29:14.23303+00	\N
48	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:29:14.23303+00	\N
91	4	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	t	2026-01-15 18:37:23.165581+00	2026-01-15 18:37:36.560692+00
50	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:33:55.033044+00	\N
52	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:33:55.033044+00	\N
53	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:33:55.033044+00	\N
54	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:33:55.033044+00	\N
55	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:33:55.033044+00	\N
92	1	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:41.289552+00	\N
57	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:51:56.660873+00	\N
59	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:51:56.660873+00	\N
60	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:51:56.660873+00	\N
61	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:51:56.660873+00	\N
62	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:51:56.660873+00	\N
64	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:52:14.018768+00	\N
66	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:52:14.018768+00	\N
67	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:52:14.018768+00	\N
68	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:52:14.018768+00	\N
69	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:52:14.018768+00	\N
71	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:55:14.790055+00	\N
73	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:55:14.790055+00	\N
74	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:55:14.790055+00	\N
75	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:55:14.790055+00	\N
76	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 17:55:14.790055+00	\N
94	3	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:41.289552+00	\N
95	5	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:41.289552+00	\N
78	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 18:04:56.310521+00	\N
80	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 18:04:56.310521+00	\N
81	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 18:04:56.310521+00	\N
82	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 18:04:56.310521+00	\N
83	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 8744 PARTS - MAC PANEL PART	14	traveler	preet	f	2026-01-15 18:04:56.310521+00	\N
96	6	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:41.289552+00	\N
85	1	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:23.165581+00	\N
87	3	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:23.165581+00	\N
88	5	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:23.165581+00	\N
89	6	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:23.165581+00	\N
90	7	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:23.165581+00	\N
97	7	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:37:41.289552+00	\N
99	1	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:38:11.477631+00	\N
101	3	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:38:11.477631+00	\N
102	5	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:38:11.477631+00	\N
103	6	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:38:11.477631+00	\N
104	7	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	f	2026-01-15 18:38:11.477631+00	\N
98	4	TRACKING_ENTRY_UPDATED	Tracking Entry Updated	bharat updated tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	t	2026-01-15 18:37:41.289552+00	2026-01-15 18:38:18.86509+00
112	4	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	t	2026-01-15 18:40:42.428315+00	2026-01-16 12:12:07.031999+00
106	1	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:42.428315+00	\N
108	3	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:42.428315+00	\N
109	5	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:42.428315+00	\N
110	6	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:42.428315+00	\N
111	7	TRACKING_ENTRY_CREATED	New Tracking Entry Started	bharat started tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:42.428315+00	\N
105	4	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - ENGINEERING	1	tracking_entry	bharat	t	2026-01-15 18:38:11.477631+00	2026-01-15 18:38:18.86509+00
113	1	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:54.792259+00	\N
115	3	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:54.792259+00	\N
116	5	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:54.792259+00	\N
117	6	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:54.792259+00	\N
118	7	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	f	2026-01-15 18:40:54.792259+00	\N
137	4	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	t	2026-01-27 19:10:48.620152+00	2026-01-28 12:06:41.44338+00
120	1	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	f	2026-01-15 20:22:12.197144+00	\N
122	3	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	f	2026-01-15 20:22:12.197144+00	\N
123	5	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	f	2026-01-15 20:22:12.197144+00	\N
124	6	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	f	2026-01-15 20:22:12.197144+00	\N
125	7	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	f	2026-01-15 20:22:12.197144+00	\N
127	1	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	f	2026-01-15 20:22:14.300631+00	\N
129	3	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	f	2026-01-15 20:22:14.300631+00	\N
130	5	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	f	2026-01-15 20:22:14.300631+00	\N
131	6	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	f	2026-01-15 20:22:14.300631+00	\N
132	7	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	f	2026-01-15 20:22:14.300631+00	\N
147	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	t	2026-01-27 19:12:20.679829+00	2026-01-28 12:06:41.44338+00
119	4	TRACKING_ENTRY_UPDATED	Tracking Entry Completed	bharat completed tracking for 8744 PARTS - PURCHASING	2	tracking_entry	bharat	t	2026-01-15 18:40:54.792259+00	2026-01-16 12:12:07.031999+00
126	4	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - PURCHASING	2	tracking_entry	kris	t	2026-01-15 20:22:12.197144+00	2026-01-16 12:12:07.031999+00
133	4	TRACKING_ENTRY_DELETED	Tracking Entry Deleted	kris deleted tracking entry for 8744 PARTS - ENGINEERING	1	tracking_entry	kris	t	2026-01-15 20:22:14.300631+00	2026-01-16 12:12:07.031999+00
134	1	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
135	2	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
136	3	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
138	5	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
139	6	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
140	7	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
141	8	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
142	27	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
143	28	TRAVELER_CREATED	New Traveler Created	preet created traveler 7946LASSYL - ADD ON ASSY	15	traveler	preet	f	2026-01-27 19:10:48.620152+00	\N
144	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
145	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
146	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
148	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
149	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
150	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
151	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
152	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
153	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:12:20.679829+00	\N
154	1	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
155	2	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
156	3	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
158	5	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
159	6	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
160	7	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
161	8	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
162	27	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
163	28	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	f	2026-01-27 19:15:09.158552+00	\N
164	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
165	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
166	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
168	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
169	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
170	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
171	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
172	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
173	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:15:42.037483+00	\N
174	1	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
175	2	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
176	3	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
178	5	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
179	6	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
180	7	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
181	8	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
182	27	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
183	28	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	f	2026-01-27 19:16:01.462695+00	\N
184	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
185	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
186	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
188	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
189	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
190	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
191	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
192	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
193	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:48.70983+00	\N
194	1	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
195	2	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
196	3	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
198	5	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
199	6	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
200	7	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
201	8	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
202	27	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
203	28	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	f	2026-01-27 19:16:57.968332+00	\N
204	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
205	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
206	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
208	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
209	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
210	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
211	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
212	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
213	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:29.908513+00	\N
214	1	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
215	2	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
216	3	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
218	5	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
219	6	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
220	7	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
221	8	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
222	27	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
223	28	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	f	2026-01-28 12:04:53.767754+00	\N
157	4	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - ENGINEERING	1	labor_entry	preet	t	2026-01-27 19:15:09.158552+00	2026-01-28 12:06:41.44338+00
167	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	2	labor_entry	preet	t	2026-01-27 19:15:42.037483+00	2026-01-28 12:06:41.44338+00
177	4	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	2	labor_entry	preet	t	2026-01-27 19:16:01.462695+00	2026-01-28 12:06:41.44338+00
187	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - WASH	3	labor_entry	preet	t	2026-01-27 19:16:48.70983+00	2026-01-28 12:06:41.44338+00
197	4	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - WASH	3	labor_entry	preet	t	2026-01-27 19:16:57.968332+00	2026-01-28 12:06:41.44338+00
207	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	4	labor_entry	preet	t	2026-01-28 12:04:29.908513+00	2026-01-28 12:06:41.44338+00
217	4	LABOR_ENTRY_UPDATED	Labor Entry Completed	preet completed labor entry for 7946LASSYL - AOI	4	labor_entry	preet	t	2026-01-28 12:04:53.767754+00	2026-01-28 12:06:41.44338+00
224	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
225	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
226	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
227	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
228	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
229	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
230	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
231	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
232	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
233	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	5	labor_entry	preet	f	2026-01-28 12:12:09.181854+00	\N
234	1	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
235	2	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
236	3	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
237	4	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
238	5	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
239	6	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
240	7	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
241	8	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
242	27	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
243	28	LABOR_ENTRY_CREATED	New Labor Entry Started	preet started labor entry for 7946LASSYL - AOI	6	labor_entry	preet	f	2026-01-28 12:12:41.022482+00	\N
244	1	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
245	2	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
246	3	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
247	4	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
248	5	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
249	6	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
250	7	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
251	8	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
252	27	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
253	28	TRAVELER_UPDATED	Traveler Updated	preet updated traveler 7946L ASSY - ADD ON ASSY	15	traveler	preet	f	2026-01-28 12:23:56.593691+00	\N
254	1	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
255	2	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
256	3	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
257	4	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
258	5	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
259	6	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
260	7	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
261	8	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
262	27	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
263	28	TRAVELER_CREATED	New Traveler Created	preet created traveler 5858 - testing	16	traveler	preet	f	2026-01-28 12:37:48.565554+00	\N
\.


--
-- Data for Name: parts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.parts (id, part_number, description, revision, work_center_code, customer_code, customer_name, is_active, created_at) FROM stdin;
\.


--
-- Data for Name: process_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.process_steps (id, traveler_id, step_number, operation, work_center_code, instructions, quantity, accepted, rejected, sign, completed_date, estimated_time, is_required, is_completed, completed_by, completed_at, created_at) FROM stdin;
80	15	1	ENGINEERING	ENGINEERING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.376299+00
81	15	2	VERIFY_BOM	VERIFY_BOM		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.430221+00
82	15	3	KITTING	KITTING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.445798+00
83	15	4	COMPONENT_PREP	COMPONENT_PREP		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.455746+00
84	15	5	SMT_PROGRAMMING	SMT_PROGRAMMING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.466462+00
85	15	6	WASH	WASH		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.475835+00
86	15	7	MANUAL_INSERTION	MANUAL_INSERTION		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.485706+00
87	15	8	WAVE	WAVE		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.496967+00
88	15	9	WASH	WASH		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.508102+00
89	15	10	AOI	AOI		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.520021+00
90	15	11	INTERNAL_TESTING	INTERNAL_TESTING		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.528848+00
91	15	12	LABELING	LABELING		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.537972+00
92	15	13	VISUAL_INSPECTION	VISUAL_INSPECTION		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.548769+00
93	15	14	PRODUCT_PICTURES	PRODUCT_PICTURES		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.558255+00
94	15	15	SHIPPING	SHIPPING		200	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:23:56.567036+00
95	16	1	ENGINEERING	ENGINEERING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:37:48.514108+00
96	16	2	VERIFY BOM	VERIFY_BOM		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:37:48.527612+00
97	16	3	KITTING	KITTING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:37:48.536364+00
98	16	4	COMPONENT PREP	COMPONENT_PREP		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:37:48.543318+00
99	16	5	PROGRAM PART	PROGRAM_PART		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-28 12:37:48.554616+00
57	14	1	ENGINEERING	ENGINEERING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.180295+00
58	14	2	INVENTORY	INVENTORY		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.206957+00
59	14	3	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.225739+00
60	14	4	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.238624+00
61	14	5	PURCHASING	PURCHASING		\N	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.252371+00
62	14	6	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.261777+00
63	14	7	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.271849+00
64	14	8	PURCHASING	PURCHASING		19	\N	\N	\N	\N	30	t	f	\N	\N	2026-01-15 18:04:56.281879+00
\.


--
-- Data for Name: step_scan_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.step_scan_events (id, traveler_id, step_id, step_type, job_number, work_center, scan_action, scanned_at, scanned_by, notes, duration_minutes) FROM stdin;
\.


--
-- Data for Name: sub_steps; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sub_steps (id, process_step_id, step_number, description, is_completed, completed_by, completed_at, notes, created_at) FROM stdin;
\.


--
-- Data for Name: traveler_time_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.traveler_time_entries (id, traveler_id, job_number, work_center, operator_name, start_time, pause_time, end_time, hours_worked, pause_duration, is_completed, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: traveler_tracking_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.traveler_tracking_logs (id, traveler_id, job_number, work_center, step_sequence, scan_type, scanned_at, scanned_by, notes) FROM stdin;
\.


--
-- Data for Name: travelers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.travelers (id, job_number, work_order_number, po_number, traveler_type, part_number, part_description, revision, quantity, customer_code, customer_name, priority, work_center, status, is_active, notes, specs, specs_date, from_stock, to_stock, ship_via, comments, due_date, ship_date, include_labor_hours, created_by, created_at, updated_at, completed_at, part_id) FROM stdin;
14	8744 PARTS	26015-3		ASSY	565210-002 PART	MAC PANEL PART	C	19	MAC PANEL	MAC PANEL	NORMAL	ENGINEERING	CREATED	f		[]						2026-01-15	2026-01-15	f	4	2026-01-15 16:51:19.375651+00	2026-01-15 18:23:29.080248+00	\N	\N
15	7946L ASSY	26027-1	2132	ASSY	AYNACORE ASSY	ADD ON ASSY	4	200	ADD-ON	ADD-ON	NORMAL	ENGINEERING	CREATED	f		[]								t	4	2026-01-27 19:10:48.281333+00	2026-01-28 12:23:56.376299+00	\N	\N
16	5858	26028-19	test	ASSY	test	testing	A	10	test	test	NORMAL	ENGINEERING	CREATED	t										t	4	2026-01-28 12:37:48.499+00	\N	\N	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, first_name, last_name, hashed_password, role, is_approver, is_active, created_at, updated_at) FROM stdin;
10	bharat	bharat@americancircuits.com	Bharat		$2b$12$lbUiz7eSiHpdCTxkLRHp7uNeLMQKX7qs0BqBAk0ifG.CxCA3ddamO	OPERATOR	f	t	2026-01-13 15:31:19.418907+00	\N
11	Obeida	obeida@americancircuits.com	Obedia		$2b$12$hcrxRnKiRvWzqW86LU3wZ.XOkp3zdBh.ohcPSRc2HPryNt2GEvaGG	OPERATOR	f	t	2026-01-13 15:32:55.54576+00	\N
12	bhavin	bhavin@americancircuits.com	Bhavin		$2b$12$uJwbN7me6k5ANlw6TL0OCu8Li3n4qijAG8dLV4jY.Fnb1peyb/RDe	OPERATOR	f	t	2026-01-13 15:34:16.045005+00	\N
13	Jayt	jayt@americancircuits.com	Jay T		$2b$12$kFPqciFaSak/TKBG6KYqzu3RUjiwVgKXQ0Rey/jWfECvvRydrboEW	OPERATOR	f	t	2026-01-13 15:35:33.355145+00	\N
14	kamlesh	kamlesh@americancircuits.com	Kamlesh		$2b$12$H6hNcAT4l3Gmx8yyYjQz7.SyUPY2wN4lLJtnrMUdNW77B6b6bD5/G	OPERATOR	f	t	2026-01-13 15:37:27.489658+00	\N
15	Daniel	daniel@americancircuits.com	Daniel		$2b$12$dx728rO8dAbUqPTQ8iV63e5GbCKcolkwdo929BUSIzNd4U7u6GYVm	OPERATOR	f	t	2026-01-13 15:39:22.011088+00	\N
16	colleen	colleen@americancircuits.com	Colleen		$2b$12$fEu5gdjfBlSPQh6F2Znu1OtHk/D6QMgnwtZPis3rDposf.iy3ZnEO	OPERATOR	f	t	2026-01-13 15:40:48.111602+00	\N
17	ramesh	ramesh@americancircuits.com	Ramesh		$2b$12$DzrHYYdWSEoZySTgujuor.pIrDPjWWjr1.y5nVpg3h1kBAaAGLFqi	OPERATOR	f	f	2026-01-13 15:44:22.528099+00	2026-01-13 15:44:34.501081+00
18	rameshkumar	ramesh@americanciruits.com	Ramesh		$2b$12$Jwd1sv.YwZxt3DdzR5FvdOpI4.kQJFSasNcoyjOPY.SRmer8p6cDy	OPERATOR	f	t	2026-01-13 15:45:12.241097+00	\N
19	keola	keola@americancircuits.com	Keola		$2b$12$SLriMzI8Gcu0MRr9tBlu5u1DylCqkg1shOLd/7A9R5YoddsCEHwrW	OPERATOR	f	t	2026-01-13 15:46:07.399973+00	\N
20	jackie	jackie@americancircuits.com	Jackie		$2b$12$2rv.Wj7LHkwkGCeUxUYAm.5u4uyzztTwVm.X4SFguU8koWwWySsxK	OPERATOR	f	t	2026-01-13 15:47:30.052501+00	\N
21	crystal	crystal@americancircuits.com	Crystal		$2b$12$9brOvBsrE/009ENUAmXG0O0pLOdXLNk4EMKNZ6WwQjN8uSWQnDFCe	OPERATOR	f	t	2026-01-13 15:48:18.033985+00	\N
22	tatyana	tatyana@americancircuits.com	Tatyana		$2b$12$aRDlxtIDiXaatXSeX3xRRuBpgJm0Ph2BnHJHjFB8yeKaOb8aX3GI2	OPERATOR	f	t	2026-01-13 15:49:58.816167+00	\N
23	maria	maria@americancircuits.comq	Maria		$2b$12$CY4TUlzLHIvADPLEcgwNIOgYYJ9ZSSRYDXSTVk4KrshZbQGCYlpcK	OPERATOR	f	t	2026-01-13 15:50:55.925459+00	\N
24	sulma	sulma@americancircuits.com	Sulma		$2b$12$heWfrl5Zrsz0rxBdkRNDOezHvFBa.ap2ZqXtJ22RHA.y6vEcueVI6	OPERATOR	f	t	2026-01-13 15:55:00.476471+00	\N
25	theresa	theresa@americancircuits.com	Theresa		$2b$12$VgTZoQrjUU7TGgLkAlvRjOtORAZN5ayV9VxhcseM1qjg/fblV/EEi	OPERATOR	f	t	2026-01-13 15:56:45.318778+00	\N
26	jessica	jessica@americancircuits.com	Jessica		$2b$12$2z5Ve0YwAschBwYZE.K.VuZk//ty2y35huwTNv5s9U6xubf3V.bB6	OPERATOR	f	t	2026-01-13 16:03:36.571799+00	\N
29	admin1	admin1@americancircuits.com	admin		$2b$12$8Yv9SHIhaElqenvb0se1Duh5o8i6TUVBIoHVG9zl1UkfAFJw0Ce0q	OPERATOR	f	f	2026-01-16 17:54:15.090825+00	2026-01-16 17:54:44.741571+00
1	adam	adam@americancircuits.com	Adam		$2b$12$SGxhoqNW1Ib8OFOoNFWMLe5d4OaEQ8JTbF/.ehNsK2WO8I9Xdb0ka	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-16 12:06:49.442695+00
2	kris	kris@americancircuits.com	Kris		$2b$12$3X30LEeq1fgHuTmAn28dweiuz8BV1dcXAjHQXm9y5tUQ64A3VO5kS	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-16 12:06:49.442695+00
3	alex	alex@americancircuits.com	Alex		$2b$12$5SZP6jpGQlP4sKnNg0O2gueHNZ7KNcbNePhQFqvA//SyADyhkgN12	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-16 12:06:49.442695+00
4	preet	preet@americancircuits.com	Preet		$2b$12$ww9R7KysIurksD2fsJV/lOThImlgryOM8atYitUi4YD5ZI5MJ/BRq	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-16 12:06:49.442695+00
5	kanav	kanav@americancircuits.com	Kanav		$2b$12$wFUw0qLJkXTthZxHjPTg/.uQcbHUmI/x1hQDI.Twu2Nd4Y3RrNOFi	ADMIN	t	t	2026-01-13 12:34:39.824065+00	2026-01-16 12:06:49.442695+00
6	pratiksha	pratiksha@americancircuits.com	Pratiksha		$2b$12$uy65rv.fyjjv3UMDPZi7oeeFBQnBtqBchRHmqJZPceiQ1UBc99mHS	ADMIN	t	t	2026-01-13 12:44:55.987754+00	2026-01-16 12:06:49.442695+00
7	cathy	cathy@americancircuits.com	Cathy		$2b$12$57P2jDaQ1yAh68u3fI2SVOYqDduwl4ODYTlnN4itR1WuLooZFyv9a	ADMIN	t	t	2026-01-13 12:44:55.987754+00	2026-01-16 12:06:49.442695+00
8	admin	admin@americancircuits.com	Admin		$2b$12$.UdZnrqOeqe9XlHERi.1Se.Z8jYIJvAGJMGCyiC1Oi.PPu1aURJ6u	ADMIN	t	t	2026-01-13 12:44:55.987754+00	2026-01-16 12:06:49.442695+00
27	rob	rob@aci.local	Rob	User	$2b$12$Z4QLRPisT7gxVboHh6/hfuxUZUS.kbJFrsJt5sw4Pg.098JBd/TAq	ADMIN	t	t	2026-01-16 16:28:43.797792+00	2026-01-16 16:30:44.170272+00
28	juliar	juliar@aci.local	Julia	R	$2b$12$bqMi3Y0Bdnkp2JAL.3RnNupOmjcyJbJh1Veb/YnZQXnpXIKIN3ULW	ADMIN	t	t	2026-01-16 16:28:43.797792+00	2026-01-16 16:30:44.170272+00
\.


--
-- Data for Name: work_centers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_centers (id, name, code, description, is_active, created_at) FROM stdin;
1	ENGINEERING	ENGINEERING	Auto-created from traveler	t	2026-01-15 16:51:19.475821+00
2	INVENTORY	INVENTORY	Auto-created from traveler	t	2026-01-15 16:51:19.51595+00
3	PURCHASING	PURCHASING	Auto-created from traveler	t	2026-01-15 16:51:19.531624+00
4	HEAT SHRINK	HEAT_SHRINK	Auto-created from traveler	t	2026-01-15 17:29:14.140607+00
5	VERIFY BOM	VERIFY_BOM	Auto-created from traveler	t	2026-01-15 17:51:56.516021+00
6	KITTING	KITTING	Auto-created from traveler	t	2026-01-27 19:10:48.463332+00
7	COMPONENT PREP	COMPONENT_PREP	Auto-created from traveler	t	2026-01-27 19:10:48.473609+00
8	SMT PROGRAMMING	SMT_PROGRAMMING	Auto-created from traveler	t	2026-01-27 19:10:48.484027+00
9	WASH	WASH	Auto-created from traveler	t	2026-01-27 19:10:48.494757+00
10	MANUAL INSERTION	MANUAL_INSERTION	Auto-created from traveler	t	2026-01-27 19:10:48.505295+00
11	WAVE	WAVE	Auto-created from traveler	t	2026-01-27 19:10:48.515736+00
12	AOI	AOI	Auto-created from traveler	t	2026-01-27 19:10:48.536124+00
13	INTERNAL TESTING	INTERNAL_TESTING	Auto-created from traveler	t	2026-01-27 19:10:48.547743+00
14	LABELING	LABELING	Auto-created from traveler	t	2026-01-27 19:10:48.560672+00
15	VISUAL INSPECTION	VISUAL_INSPECTION	Auto-created from traveler	t	2026-01-27 19:10:48.572343+00
16	PRODUCT PICTURES	PRODUCT_PICTURES	Auto-created from traveler	t	2026-01-27 19:10:48.583758+00
17	SHIPPING	SHIPPING	Auto-created from traveler	t	2026-01-27 19:10:48.591608+00
18	PROGRAM PART	PROGRAM_PART	Auto-created from traveler	t	2026-01-28 12:37:48.549276+00
\.


--
-- Data for Name: work_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_orders (id, job_number, work_order_number, part_number, part_description, revision, quantity, customer_code, customer_name, work_center, priority, process_template, is_active, created_at) FROM stdin;
\.


--
-- Name: approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.approvals_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 11, true);


--
-- Name: labor_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.labor_entries_id_seq', 6, true);


--
-- Name: manual_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.manual_steps_id_seq', 1, false);


--
-- Name: nexus_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_approvals_id_seq', 1, false);


--
-- Name: nexus_audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_audit_logs_id_seq', 1, false);


--
-- Name: nexus_labor_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_labor_entries_id_seq', 1, false);


--
-- Name: nexus_manual_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_manual_steps_id_seq', 1, false);


--
-- Name: nexus_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_notifications_id_seq', 1, false);


--
-- Name: nexus_parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_parts_id_seq', 1, false);


--
-- Name: nexus_process_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_process_steps_id_seq', 1, false);


--
-- Name: nexus_step_scan_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_step_scan_events_id_seq', 1, false);


--
-- Name: nexus_sub_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_sub_steps_id_seq', 1, false);


--
-- Name: nexus_traveler_time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_traveler_time_entries_id_seq', 1, false);


--
-- Name: nexus_traveler_tracking_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_traveler_tracking_logs_id_seq', 1, false);


--
-- Name: nexus_travelers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_travelers_id_seq', 1, false);


--
-- Name: nexus_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_users_id_seq', 5, true);


--
-- Name: nexus_work_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_work_centers_id_seq', 1, false);


--
-- Name: nexus_work_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nexus_work_orders_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 263, true);


--
-- Name: parts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.parts_id_seq', 1, false);


--
-- Name: process_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.process_steps_id_seq', 99, true);


--
-- Name: step_scan_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.step_scan_events_id_seq', 1, false);


--
-- Name: sub_steps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sub_steps_id_seq', 1, false);


--
-- Name: traveler_time_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.traveler_time_entries_id_seq', 2, true);


--
-- Name: traveler_tracking_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.traveler_tracking_logs_id_seq', 1, false);


--
-- Name: travelers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.travelers_id_seq', 16, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 29, true);


--
-- Name: work_centers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_centers_id_seq', 18, true);


--
-- Name: work_orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.work_orders_id_seq', 1, false);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: labor_entries labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_pkey PRIMARY KEY (id);


--
-- Name: manual_steps manual_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_approvals nexus_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_pkey PRIMARY KEY (id);


--
-- Name: nexus_audit_logs nexus_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: nexus_labor_entries nexus_labor_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_pkey PRIMARY KEY (id);


--
-- Name: nexus_manual_steps nexus_manual_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_notifications nexus_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications
    ADD CONSTRAINT nexus_notifications_pkey PRIMARY KEY (id);


--
-- Name: nexus_parts nexus_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_parts
    ADD CONSTRAINT nexus_parts_pkey PRIMARY KEY (id);


--
-- Name: nexus_process_steps nexus_process_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_pkey PRIMARY KEY (id);


--
-- Name: nexus_sub_steps nexus_sub_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_pkey PRIMARY KEY (id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_pkey PRIMARY KEY (id);


--
-- Name: nexus_traveler_tracking_logs nexus_traveler_tracking_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs
    ADD CONSTRAINT nexus_traveler_tracking_logs_pkey PRIMARY KEY (id);


--
-- Name: nexus_travelers nexus_travelers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_pkey PRIMARY KEY (id);


--
-- Name: nexus_users nexus_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_users
    ADD CONSTRAINT nexus_users_pkey PRIMARY KEY (id);


--
-- Name: nexus_work_centers nexus_work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers
    ADD CONSTRAINT nexus_work_centers_code_key UNIQUE (code);


--
-- Name: nexus_work_centers nexus_work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_centers
    ADD CONSTRAINT nexus_work_centers_pkey PRIMARY KEY (id);


--
-- Name: nexus_work_orders nexus_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_work_orders
    ADD CONSTRAINT nexus_work_orders_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parts parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parts
    ADD CONSTRAINT parts_pkey PRIMARY KEY (id);


--
-- Name: process_steps process_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_pkey PRIMARY KEY (id);


--
-- Name: step_scan_events step_scan_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_pkey PRIMARY KEY (id);


--
-- Name: sub_steps sub_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_pkey PRIMARY KEY (id);


--
-- Name: traveler_time_entries traveler_time_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_pkey PRIMARY KEY (id);


--
-- Name: traveler_tracking_logs traveler_tracking_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs
    ADD CONSTRAINT traveler_tracking_logs_pkey PRIMARY KEY (id);


--
-- Name: travelers travelers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: work_centers work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_code_key UNIQUE (code);


--
-- Name: work_centers work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: ix_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_approvals_id ON public.approvals USING btree (id);


--
-- Name: ix_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_audit_logs_id ON public.audit_logs USING btree (id);


--
-- Name: ix_labor_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_labor_entries_id ON public.labor_entries USING btree (id);


--
-- Name: ix_manual_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_manual_steps_id ON public.manual_steps USING btree (id);


--
-- Name: ix_nexus_approvals_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_approvals_id ON public.nexus_approvals USING btree (id);


--
-- Name: ix_nexus_audit_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_audit_logs_id ON public.nexus_audit_logs USING btree (id);


--
-- Name: ix_nexus_labor_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_labor_entries_id ON public.nexus_labor_entries USING btree (id);


--
-- Name: ix_nexus_manual_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_manual_steps_id ON public.nexus_manual_steps USING btree (id);


--
-- Name: ix_nexus_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_notifications_created_at ON public.nexus_notifications USING btree (created_at);


--
-- Name: ix_nexus_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_notifications_id ON public.nexus_notifications USING btree (id);


--
-- Name: ix_nexus_parts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_parts_id ON public.nexus_parts USING btree (id);


--
-- Name: ix_nexus_parts_part_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_parts_part_number ON public.nexus_parts USING btree (part_number);


--
-- Name: ix_nexus_process_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_process_steps_id ON public.nexus_process_steps USING btree (id);


--
-- Name: ix_nexus_step_scan_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_id ON public.nexus_step_scan_events USING btree (id);


--
-- Name: ix_nexus_step_scan_events_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_job_number ON public.nexus_step_scan_events USING btree (job_number);


--
-- Name: ix_nexus_step_scan_events_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_step_scan_events_scanned_at ON public.nexus_step_scan_events USING btree (scanned_at);


--
-- Name: ix_nexus_sub_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_sub_steps_id ON public.nexus_sub_steps USING btree (id);


--
-- Name: ix_nexus_traveler_time_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_time_entries_id ON public.nexus_traveler_time_entries USING btree (id);


--
-- Name: ix_nexus_traveler_time_entries_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_time_entries_job_number ON public.nexus_traveler_time_entries USING btree (job_number);


--
-- Name: ix_nexus_traveler_tracking_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_id ON public.nexus_traveler_tracking_logs USING btree (id);


--
-- Name: ix_nexus_traveler_tracking_logs_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_job_number ON public.nexus_traveler_tracking_logs USING btree (job_number);


--
-- Name: ix_nexus_traveler_tracking_logs_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_traveler_tracking_logs_scanned_at ON public.nexus_traveler_tracking_logs USING btree (scanned_at);


--
-- Name: ix_nexus_travelers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_id ON public.nexus_travelers USING btree (id);


--
-- Name: ix_nexus_travelers_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_job_number ON public.nexus_travelers USING btree (job_number);


--
-- Name: ix_nexus_travelers_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_travelers_work_order_number ON public.nexus_travelers USING btree (work_order_number);


--
-- Name: ix_nexus_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_nexus_users_email ON public.nexus_users USING btree (email);


--
-- Name: ix_nexus_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_users_id ON public.nexus_users USING btree (id);


--
-- Name: ix_nexus_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_nexus_users_username ON public.nexus_users USING btree (username);


--
-- Name: ix_nexus_work_centers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_centers_id ON public.nexus_work_centers USING btree (id);


--
-- Name: ix_nexus_work_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_id ON public.nexus_work_orders USING btree (id);


--
-- Name: ix_nexus_work_orders_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_job_number ON public.nexus_work_orders USING btree (job_number);


--
-- Name: ix_nexus_work_orders_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_nexus_work_orders_work_order_number ON public.nexus_work_orders USING btree (work_order_number);


--
-- Name: ix_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: ix_notifications_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_id ON public.notifications USING btree (id);


--
-- Name: ix_parts_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_id ON public.parts USING btree (id);


--
-- Name: ix_parts_part_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_parts_part_number ON public.parts USING btree (part_number);


--
-- Name: ix_process_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_process_steps_id ON public.process_steps USING btree (id);


--
-- Name: ix_step_scan_events_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_id ON public.step_scan_events USING btree (id);


--
-- Name: ix_step_scan_events_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_job_number ON public.step_scan_events USING btree (job_number);


--
-- Name: ix_step_scan_events_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_step_scan_events_scanned_at ON public.step_scan_events USING btree (scanned_at);


--
-- Name: ix_sub_steps_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sub_steps_id ON public.sub_steps USING btree (id);


--
-- Name: ix_traveler_time_entries_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_time_entries_id ON public.traveler_time_entries USING btree (id);


--
-- Name: ix_traveler_time_entries_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_time_entries_job_number ON public.traveler_time_entries USING btree (job_number);


--
-- Name: ix_traveler_tracking_logs_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_id ON public.traveler_tracking_logs USING btree (id);


--
-- Name: ix_traveler_tracking_logs_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_job_number ON public.traveler_tracking_logs USING btree (job_number);


--
-- Name: ix_traveler_tracking_logs_scanned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_traveler_tracking_logs_scanned_at ON public.traveler_tracking_logs USING btree (scanned_at);


--
-- Name: ix_travelers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_id ON public.travelers USING btree (id);


--
-- Name: ix_travelers_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_job_number ON public.travelers USING btree (job_number);


--
-- Name: ix_travelers_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_travelers_work_order_number ON public.travelers USING btree (work_order_number);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: ix_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_username ON public.users USING btree (username);


--
-- Name: ix_work_centers_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_centers_id ON public.work_centers USING btree (id);


--
-- Name: ix_work_orders_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_id ON public.work_orders USING btree (id);


--
-- Name: ix_work_orders_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_job_number ON public.work_orders USING btree (job_number);


--
-- Name: ix_work_orders_work_order_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_orders_work_order_number ON public.work_orders USING btree (work_order_number);


--
-- Name: approvals approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: approvals approvals_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: audit_logs audit_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: labor_entries labor_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id);


--
-- Name: labor_entries labor_entries_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.process_steps(id);


--
-- Name: labor_entries labor_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.labor_entries
    ADD CONSTRAINT labor_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: manual_steps manual_steps_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.users(id);


--
-- Name: manual_steps manual_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_steps
    ADD CONSTRAINT manual_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: nexus_approvals nexus_approvals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_approvals nexus_approvals_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_approvals
    ADD CONSTRAINT nexus_approvals_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_audit_logs nexus_audit_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_audit_logs nexus_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_audit_logs
    ADD CONSTRAINT nexus_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.nexus_process_steps(id);


--
-- Name: nexus_labor_entries nexus_labor_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_labor_entries
    ADD CONSTRAINT nexus_labor_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_manual_steps nexus_manual_steps_added_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_added_by_fkey FOREIGN KEY (added_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_manual_steps nexus_manual_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_manual_steps
    ADD CONSTRAINT nexus_manual_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_notifications nexus_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_notifications
    ADD CONSTRAINT nexus_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nexus_users(id);


--
-- Name: nexus_process_steps nexus_process_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_process_steps nexus_process_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_process_steps nexus_process_steps_work_center_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_process_steps
    ADD CONSTRAINT nexus_process_steps_work_center_code_fkey FOREIGN KEY (work_center_code) REFERENCES public.nexus_work_centers(code);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_scanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_step_scan_events nexus_step_scan_events_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_step_scan_events
    ADD CONSTRAINT nexus_step_scan_events_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_sub_steps nexus_sub_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_sub_steps nexus_sub_steps_process_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_sub_steps
    ADD CONSTRAINT nexus_sub_steps_process_step_id_fkey FOREIGN KEY (process_step_id) REFERENCES public.nexus_process_steps(id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_traveler_time_entries nexus_traveler_time_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_time_entries
    ADD CONSTRAINT nexus_traveler_time_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_traveler_tracking_logs nexus_traveler_tracking_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_traveler_tracking_logs
    ADD CONSTRAINT nexus_traveler_tracking_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.nexus_travelers(id);


--
-- Name: nexus_travelers nexus_travelers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nexus_users(id);


--
-- Name: nexus_travelers nexus_travelers_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_travelers
    ADD CONSTRAINT nexus_travelers_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.nexus_parts(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: process_steps process_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: process_steps process_steps_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: process_steps process_steps_work_center_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_steps
    ADD CONSTRAINT process_steps_work_center_code_fkey FOREIGN KEY (work_center_code) REFERENCES public.work_centers(code);


--
-- Name: step_scan_events step_scan_events_scanned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_scanned_by_fkey FOREIGN KEY (scanned_by) REFERENCES public.users(id);


--
-- Name: step_scan_events step_scan_events_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_scan_events
    ADD CONSTRAINT step_scan_events_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: sub_steps sub_steps_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: sub_steps sub_steps_process_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_steps
    ADD CONSTRAINT sub_steps_process_step_id_fkey FOREIGN KEY (process_step_id) REFERENCES public.process_steps(id);


--
-- Name: traveler_time_entries traveler_time_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: traveler_time_entries traveler_time_entries_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_time_entries
    ADD CONSTRAINT traveler_time_entries_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: traveler_tracking_logs traveler_tracking_logs_traveler_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.traveler_tracking_logs
    ADD CONSTRAINT traveler_tracking_logs_traveler_id_fkey FOREIGN KEY (traveler_id) REFERENCES public.travelers(id);


--
-- Name: travelers travelers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: travelers travelers_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.travelers
    ADD CONSTRAINT travelers_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.parts(id);


--
-- PostgreSQL database dump complete
--

\unrestrict igKUWrd7hZc9ldtjQv1N7lrv82sBUr59LdGtEfirRHolUFWOYAz2UPgqRjgXsES

